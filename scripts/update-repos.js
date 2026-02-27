// scripts/update-repos.js
// Busca todos os repositórios públicos do usuário via GitHub API
// e atualiza a seção "Projetos em destaque" no README.md

const fs = require("fs");

const USERNAME = process.env.GITHUB_USERNAME || "reyrxi";
const TOKEN = process.env.GITHUB_TOKEN;
const README_PATH = "README.md";

// Repos para ignorar (forks gerados automaticamente, repos de config etc.)
const IGNORED_REPOS = [USERNAME, `${USERNAME}.github.io`];

async function fetchRepos() {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
  };

  let allRepos = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}&sort=updated&type=public`,
      { headers }
    );

    if (!res.ok) {
      throw new Error(`GitHub API erro: ${res.status} ${res.statusText}`);
    }

    const repos = await res.json();
    if (repos.length === 0) break;

    allRepos = allRepos.concat(repos);
    page++;
  }

  return allRepos
    .filter((r) => !r.fork && !IGNORED_REPOS.includes(r.name))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

function buildRepoCard(repo) {
  const description = repo.description
    ? repo.description.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : "Sem descrição";

  const stars = repo.stargazers_count;
  const forks = repo.forks_count;
  const lang = repo.language || "";

  // Mapa de cores por linguagem (padrão GitHub)
  const langColors = {
    TypeScript: "3178C6",
    JavaScript: "F7DF1E",
    Python: "3776AB",
    HTML: "E34F26",
    CSS: "1572B6",
    Shell: "89E051",
    Vue: "4FC08D",
    Go: "00ADD8",
  };

  const langColor = langColors[lang] || "858585";

  const langBadge = lang
    ? `![${lang}](https://img.shields.io/badge/-${encodeURIComponent(lang)}-${langColor}?style=flat-square&logoColor=white)`
    : "";

  const starsBadge =
    stars > 0
      ? `![Stars](https://img.shields.io/badge/⭐_${stars}-FFD700?style=flat-square)`
      : "";

  const forksBadge =
    forks > 0
      ? `![Forks](https://img.shields.io/badge/🍴_${forks}-gray?style=flat-square)`
      : "";

  const badges = [langBadge, starsBadge, forksBadge].filter(Boolean).join(" ");

  return [
    `### [${repo.name}](${repo.html_url})`,
    `${description}`,
    badges,
    "",
  ].join("\n");
}

function buildSection(repos) {
  const updatedAt = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  const cards = repos.map(buildRepoCard).join("\n");

  return [
    "<!-- PROJECTS:START -->",
    `## 🚀 Projetos em destaque`,
    ``,
    `> Atualizado automaticamente em ${updatedAt} (horário de Brasília)`,
    ``,
    cards,
    "<!-- PROJECTS:END -->",
  ].join("\n");
}

async function main() {
  console.log(`Buscando repositórios de @${USERNAME}...`);

  const repos = await fetchRepos();
  console.log(`${repos.length} repositórios encontrados.`);

  const newSection = buildSection(repos);

  let readme = fs.readFileSync(README_PATH, "utf8");

  // Substitui o bloco entre os marcadores, ou insere antes do rodapé
  if (readme.includes("<!-- PROJECTS:START -->")) {
    readme = readme.replace(
      /<!-- PROJECTS:START -->[\s\S]*?<!-- PROJECTS:END -->/,
      newSection
    );
  } else {
    // Fallback: substitui a seção manual de projetos se existir
    readme = readme.replace(
      /## 🚀 Projetos em destaque[\s\S]*?(?=\n---)/,
      newSection + "\n"
    );
  }

  fs.writeFileSync(README_PATH, readme, "utf8");
  console.log("README.md atualizado com sucesso!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
