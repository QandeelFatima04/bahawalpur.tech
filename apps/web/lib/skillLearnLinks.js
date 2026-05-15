// Map a skill string -> { url, label } pointing to a free learning resource.
// Preference order: W3Schools (beginner-friendly) > MDN (web standards) > official
// vendor docs/tutorials > freeCodeCamp / Coursera / YouTube > a Google search fallback.
// Canonicalization mirrors apps/api/app/services/skills.py so a backend skill that
// matched a canonical form also resolves here.

const DIRECT = {
  // Web fundamentals
  html: "https://www.w3schools.com/html/",
  css: "https://www.w3schools.com/css/",
  javascript: "https://www.w3schools.com/js/",
  typescript: "https://www.typescriptlang.org/docs/handbook/intro.html",
  bootstrap: "https://www.w3schools.com/bootstrap5/",
  tailwindcss: "https://tailwindcss.com/docs/installation",
  sass: "https://sass-lang.com/guide/",
  jquery: "https://www.w3schools.com/jquery/",
  // Languages
  python: "https://www.w3schools.com/python/",
  java: "https://www.w3schools.com/java/",
  csharp: "https://www.w3schools.com/cs/",
  cplusplus: "https://www.w3schools.com/cpp/",
  c: "https://www.w3schools.com/c/",
  php: "https://www.w3schools.com/php/",
  ruby: "https://www.ruby-lang.org/en/documentation/quickstart/",
  golang: "https://go.dev/learn/",
  rust: "https://doc.rust-lang.org/book/",
  kotlin: "https://kotlinlang.org/docs/getting-started.html",
  swift: "https://www.swift.org/getting-started/",
  scala: "https://docs.scala-lang.org/tour/tour-of-scala.html",
  dart: "https://dart.dev/guides",
  r: "https://www.w3schools.com/r/",
  perl: "https://www.perl.org/learn.html",
  // Frameworks / libraries
  reactjs: "https://react.dev/learn",
  reactnative: "https://reactnative.dev/docs/tutorial",
  nextjs: "https://nextjs.org/learn",
  vuejs: "https://vuejs.org/tutorial/",
  angular: "https://angular.dev/tutorials",
  svelte: "https://learn.svelte.dev/",
  nodejs: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs",
  expressjs: "https://expressjs.com/en/starter/installing.html",
  spring: "https://spring.io/guides/gs/spring-boot",
  springboot: "https://spring.io/guides/gs/spring-boot",
  django: "https://docs.djangoproject.com/en/stable/intro/tutorial01/",
  flask: "https://flask.palletsprojects.com/en/latest/tutorial/",
  fastapi: "https://fastapi.tiangolo.com/tutorial/",
  laravel: "https://laravel.com/docs",
  rails: "https://guides.rubyonrails.org/",
  flutter: "https://docs.flutter.dev/get-started/codelab",
  // Databases / data
  sql: "https://www.w3schools.com/sql/",
  mysql: "https://www.w3schools.com/mysql/",
  postgresql: "https://www.postgresqltutorial.com/",
  sqlite: "https://www.sqlite.org/docs.html",
  mongodb: "https://learn.mongodb.com/",
  redis: "https://redis.io/docs/latest/develop/",
  graphql: "https://graphql.org/learn/",
  firebase: "https://firebase.google.com/docs",
  // DevOps / cloud
  docker: "https://docs.docker.com/get-started/",
  kubernetes: "https://kubernetes.io/docs/tutorials/",
  terraform: "https://developer.hashicorp.com/terraform/tutorials",
  ansible: "https://docs.ansible.com/ansible/latest/getting_started/index.html",
  aws: "https://aws.amazon.com/getting-started/",
  googlecloud: "https://cloud.google.com/training",
  azure: "https://learn.microsoft.com/en-us/training/azure/",
  linux: "https://www.w3schools.com/linux/",
  bash: "https://www.w3schools.com/bash/",
  shell: "https://www.w3schools.com/bash/",
  nginx: "https://nginx.org/en/docs/",
  apache: "https://httpd.apache.org/docs/current/",
  jenkins: "https://www.jenkins.io/doc/tutorials/",
  githubactions: "https://docs.github.com/en/actions",
  cicd: "https://docs.github.com/en/actions",
  git: "https://www.w3schools.com/git/",
  github: "https://www.w3schools.com/git/",
  // Testing
  jest: "https://jestjs.io/docs/getting-started",
  vitest: "https://vitest.dev/guide/",
  pytest: "https://docs.pytest.org/en/stable/getting-started.html",
  cypress: "https://docs.cypress.io",
  playwright: "https://playwright.dev/docs/intro",
  selenium: "https://www.selenium.dev/documentation/",
  junit: "https://junit.org/junit5/docs/current/user-guide/",
  // AI / ML / data science
  machinelearning: "https://www.coursera.org/learn/machine-learning",
  artificialintelligence: "https://www.coursera.org/learn/ai-for-everyone",
  deeplearning: "https://www.deeplearning.ai/courses/",
  tensorflow: "https://www.tensorflow.org/tutorials",
  pytorch: "https://pytorch.org/tutorials/",
  pandas: "https://pandas.pydata.org/docs/getting_started/index.html",
  numpy: "https://numpy.org/learn/",
  scikitlearn: "https://scikit-learn.org/stable/tutorial/index.html",
  opencv: "https://docs.opencv.org/4.x/d9/df8/tutorial_root.html",
  nlp: "https://www.coursera.org/specializations/natural-language-processing",
  datascience: "https://www.coursera.org/professional-certificates/ibm-data-science",
  dataanalyst: "https://www.coursera.org/professional-certificates/google-data-analytics",
  // Cybersecurity
  cybersecurity: "https://www.coursera.org/specializations/cyber-security",
  webapplicationsecurity: "https://portswigger.net/web-security",
  apipenetrationtesting: "https://owasp.org/www-project-api-security/",
  mobileapplicationsecurity: "https://owasp.org/www-project-mobile-app-security/",
  aillmpenetrationtesting: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
  thickclientpenetrationtesting: "https://book.hacktricks.xyz/network-services-pentesting/pentesting-thick-clients",
  externalnetworksecurity: "https://www.hackerone.com/knowledge-center/network-penetration-testing",
  owasptop10: "https://owasp.org/www-project-top-ten/",
  owasptop10andbusinesslogic: "https://owasp.org/www-project-top-ten/",
  burpsuite: "https://portswigger.net/web-security",
  owaspzap: "https://www.zaproxy.org/getting-started/",
  nmap: "https://nmap.org/book/",
  wireshark: "https://www.wireshark.org/docs/wsug_html_chunked/",
  metasploit: "https://www.offsec.com/metasploit-unleashed/",
  sqlmap: "https://github.com/sqlmapproject/sqlmap/wiki/Usage",
  nuclei: "https://docs.projectdiscovery.io/tools/nuclei/overview",
  frida: "https://frida.re/docs/home/",
  nessus: "https://docs.tenable.com/nessus.htm",
  nexpose: "https://docs.rapid7.com/nexpose/",
  // Other tools / platforms
  dotnet: "https://learn.microsoft.com/en-us/dotnet/",
  rabbitmq: "https://www.rabbitmq.com/getstarted.html",
  kafka: "https://kafka.apache.org/quickstart",
  elasticsearch: "https://www.elastic.co/guide/en/elasticsearch/reference/current/getting-started.html",
  figma: "https://help.figma.com/hc/en-us/categories/360002042553-Get-started",
  jira: "https://www.atlassian.com/agile/tutorials",
  confluence: "https://www.atlassian.com/software/confluence/guides",
  // Career tracks (kept for users who type a track name)
  frontend: "https://www.theodinproject.com/paths/foundations/courses/foundations",
  backend: "https://roadmap.sh/backend",
  fullstack: "https://www.theodinproject.com/paths/full-stack-javascript",
  devops: "https://www.coursera.org/specializations/devops-on-aws",
  ux: "https://www.coursera.org/professional-certificates/google-ux-design",
  qa: "https://www.coursera.org/learn/introduction-software-testing",
  blockchain: "https://ethereum.org/en/developers/tutorials/",
  gamedeveloper: "https://learn.unity.com/",
  productmanager: "https://www.coursera.org/professional-certificates/google-project-management",
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
    // Security skill variants (resumes often phrase these freeform)
    apipentesting: "apipenetrationtesting",
    apipentest: "apipenetrationtesting",
    apisecurity: "apipenetrationtesting",
    mobilepentesting: "mobileapplicationsecurity",
    mobilesecurity: "mobileapplicationsecurity",
    llmsecurity: "aillmpenetrationtesting",
    llmpentesting: "aillmpenetrationtesting",
    aisecurity: "aillmpenetrationtesting",
    thickclientpentesting: "thickclientpenetrationtesting",
    webappsecurity: "webapplicationsecurity",
    websecurity: "webapplicationsecurity",
    networksecurity: "externalnetworksecurity",
    networkpentesting: "externalnetworksecurity",
    pentesting: "webapplicationsecurity",
    penetrationtesting: "webapplicationsecurity",
    informationsecurity: "cybersecurity",
    infosec: "cybersecurity",
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
  // Fallback — Google "learn <skill> free tutorial" so users always land on real material.
  return {
    url: `https://www.google.com/search?q=${encodeURIComponent(`learn ${prettyLabel(skill)} free tutorial`)}`,
    label: `Learn ${prettyLabel(skill)}`,
  };
}
