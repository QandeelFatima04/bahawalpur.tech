// Map a skill string -> { url, label } pointing to a free learning resource.
// Preference order: roadmap.sh > vendor official docs > MDN > a search fallback.
// Canonicalization mirrors apps/api/app/services/skills.py so a backend skill that
// matched a canonical form also resolves here.

const ROADMAP = "https://roadmap.sh";

const DIRECT = {
  // Career tracks
  frontend: `${ROADMAP}/frontend`,
  backend: `${ROADMAP}/backend`,
  fullstack: `${ROADMAP}/full-stack`,
  devops: `${ROADMAP}/devops`,
  cybersecurity: `${ROADMAP}/cyber-security`,
  datascience: `${ROADMAP}/ai-data-scientist`,
  dataanalyst: `${ROADMAP}/data-analyst`,
  androiddevelopment: `${ROADMAP}/android`,
  ios: `${ROADMAP}/ios`,
  ux: `${ROADMAP}/ux-design`,
  qa: `${ROADMAP}/qa`,
  blockchain: `${ROADMAP}/blockchain`,
  gamedeveloper: `${ROADMAP}/game-developer`,
  productmanager: `${ROADMAP}/product-manager`,
  engineeringmanager: `${ROADMAP}/engineering-manager`,
  technicalwriter: `${ROADMAP}/technical-writer`,
  // Frameworks / libraries
  reactjs: `${ROADMAP}/react`,
  reactnative: `${ROADMAP}/react-native`,
  nextjs: "https://nextjs.org/learn",
  vuejs: `${ROADMAP}/vue`,
  angular: `${ROADMAP}/angular`,
  nodejs: `${ROADMAP}/nodejs`,
  spring: `${ROADMAP}/spring-boot`,
  springboot: `${ROADMAP}/spring-boot`,
  django: "https://docs.djangoproject.com/en/stable/intro/tutorial01/",
  flask: "https://flask.palletsprojects.com/en/latest/tutorial/",
  fastapi: "https://fastapi.tiangolo.com/tutorial/",
  laravel: "https://laravel.com/docs",
  rails: "https://guides.rubyonrails.org/",
  // Languages
  javascript: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
  typescript: `${ROADMAP}/typescript`,
  python: `${ROADMAP}/python`,
  java: `${ROADMAP}/java`,
  golang: `${ROADMAP}/golang`,
  rust: `${ROADMAP}/rust`,
  csharp: "https://learn.microsoft.com/en-us/dotnet/csharp/",
  cplusplus: `${ROADMAP}/cpp`,
  ruby: "https://www.ruby-lang.org/en/documentation/quickstart/",
  php: `${ROADMAP}/php`,
  kotlin: `${ROADMAP}/android`,
  swift: `${ROADMAP}/ios`,
  scala: "https://docs.scala-lang.org/tour/tour-of-scala.html",
  dart: "https://dart.dev/guides",
  // Data / SQL / NoSQL
  sql: `${ROADMAP}/sql`,
  postgresql: `${ROADMAP}/postgresql-dba`,
  mysql: "https://dev.mysql.com/doc/refman/8.0/en/tutorial.html",
  sqlite: "https://www.sqlite.org/docs.html",
  mongodb: `${ROADMAP}/mongodb`,
  redis: `${ROADMAP}/redis`,
  graphql: `${ROADMAP}/graphql`,
  // DevOps / cloud
  docker: `${ROADMAP}/docker`,
  kubernetes: `${ROADMAP}/kubernetes`,
  terraform: `${ROADMAP}/terraform`,
  ansible: `${ROADMAP}/devops`,
  aws: `${ROADMAP}/aws`,
  googlecloud: "https://cloud.google.com/training",
  azure: "https://learn.microsoft.com/en-us/training/azure/",
  linux: `${ROADMAP}/linux`,
  bash: "https://learnxinyminutes.com/docs/bash/",
  shell: "https://learnxinyminutes.com/docs/bash/",
  nginx: "https://nginx.org/en/docs/",
  jenkins: "https://www.jenkins.io/doc/tutorials/",
  githubactions: "https://docs.github.com/en/actions",
  cicd: "https://docs.github.com/en/actions",
  git: `${ROADMAP}/git-github`,
  github: `${ROADMAP}/git-github`,
  // Web fundamentals
  html: "https://developer.mozilla.org/en-US/docs/Web/HTML",
  css: "https://developer.mozilla.org/en-US/docs/Web/CSS",
  tailwindcss: "https://tailwindcss.com/docs/installation",
  sass: "https://sass-lang.com/guide/",
  bootstrap: "https://getbootstrap.com/docs/",
  // Testing
  jest: "https://jestjs.io/docs/getting-started",
  vitest: "https://vitest.dev/guide/",
  pytest: "https://docs.pytest.org/en/stable/getting-started.html",
  cypress: "https://docs.cypress.io",
  playwright: "https://playwright.dev/docs/intro",
  selenium: "https://www.selenium.dev/documentation/",
  // Cybersecurity tools
  burpsuite: "https://portswigger.net/web-security/getting-started",
  owaspzap: "https://www.zaproxy.org/getting-started/",
  nmap: "https://nmap.org/book/man.html",
  wireshark: "https://www.wireshark.org/docs/wsug_html_chunked/",
  metasploit: "https://docs.rapid7.com/metasploit/",
  // AI / ML
  machinelearning: `${ROADMAP}/ai-data-scientist`,
  artificialintelligence: `${ROADMAP}/ai-data-scientist`,
  deeplearning: "https://www.deeplearning.ai/courses/",
  tensorflow: "https://www.tensorflow.org/tutorials",
  pytorch: "https://pytorch.org/tutorials/",
  pandas: "https://pandas.pydata.org/docs/getting_started/index.html",
  numpy: "https://numpy.org/learn/",
  // Misc
  dotnet: "https://learn.microsoft.com/en-us/dotnet/",
  rabbitmq: "https://www.rabbitmq.com/getstarted.html",
  kafka: "https://kafka.apache.org/quickstart",
  elasticsearch: "https://www.elastic.co/guide/en/elasticsearch/reference/current/getting-started.html",
};

function canonicalKey(skill) {
  const s = String(skill || "").trim().toLowerCase();
  // Strip whitespace, hyphens, underscores, dots, slashes (matches services/skills.py).
  const stripped = s.replace(/[\s\-_./]+/g, "");
  // A small alias layer for the most common variants — keep it in sync with the
  // backend canonicalizer's intent.
  const ALIASES = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    postgres: "postgresql",
    zap: "owaspzap",
    owaspzapproxy: "owaspzap",
    zedattackproxy: "owaspzap",
    k8s: "kubernetes",
    kube: "kubernetes",
    react: "reactjs",
    "react.js": "reactjs",
    "node.js": "nodejs",
    "next.js": "nextjs",
    "vue.js": "vuejs",
    ml: "machinelearning",
    ai: "artificialintelligence",
    "c++": "cplusplus",
    "c#": "csharp",
    ".net": "dotnet",
    amazonwebservices: "aws",
    gcp: "googlecloud",
    googlecloudplatform: "googlecloud",
  };
  return ALIASES[stripped] || ALIASES[s] || stripped;
}

function prettyLabel(skill) {
  return String(skill || "").trim();
}

export function getLearnLink(skill) {
  const key = canonicalKey(skill);
  const direct = DIRECT[key];
  if (direct) {
    return { url: direct, label: `Learn ${prettyLabel(skill)}` };
  }
  // Fallback — roadmap.sh's site search; reliably surfaces an adjacent roadmap.
  return {
    url: `https://roadmap.sh/?q=${encodeURIComponent(prettyLabel(skill))}`,
    label: `Learn ${prettyLabel(skill)}`,
  };
}
