// Skill synonym map for the analyze pipeline.
//
// Solves the one gap the LLM-based scorer has: when the resume says "ML"
// and the JD says "machine learning", or "k8s" vs "Kubernetes", the model
// sometimes misses the match because it's comparing surface strings rather
// than concepts. This map is injected into the analyze prompt so the model
// knows these are equivalent before scoring.
//
// Maintained manually. Add entries as real misses are observed in production
// logs, not speculatively. A wrong synonym (e.g. "Java" = "JavaScript") is
// worse than a missing one.

const SYNONYMS = {
  'machine learning': ['ml', 'deep learning', 'dl'],
  'artificial intelligence': ['ai'],
  'kubernetes': ['k8s'],
  'javascript': ['js', 'es6', 'ecmascript'],
  'typescript': ['ts'],
  'postgresql': ['postgres', 'psql'],
  'mongodb': ['mongo'],
  'amazon web services': ['aws'],
  'google cloud platform': ['gcp', 'google cloud'],
  'microsoft azure': ['azure'],
  'continuous integration': ['ci', 'ci/cd', 'cicd'],
  'continuous deployment': ['cd', 'ci/cd', 'cicd'],
  'react.js': ['react', 'reactjs'],
  'node.js': ['node', 'nodejs'],
  'next.js': ['next', 'nextjs'],
  'vue.js': ['vue', 'vuejs'],
  'express.js': ['express', 'expressjs'],
  'graphql': ['gql'],
  'rest api': ['restful', 'rest apis', 'restful api'],
  'nosql': ['non-relational', 'document database'],
  'sql': ['structured query language', 'relational database'],
  'docker': ['containerization', 'containers'],
  'agile': ['scrum', 'kanban', 'sprint'],
  'object oriented programming': ['oop', 'object-oriented'],
  'natural language processing': ['nlp'],
  'computer vision': ['cv', 'image recognition'],
  'large language models': ['llm', 'llms'],
  'retrieval augmented generation': ['rag'],
};

// Build a flat lookup: every alias -> canonical form.
const ALIAS_TO_CANONICAL = {};
for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
  const lower = canonical.toLowerCase();
  ALIAS_TO_CANONICAL[lower] = lower;
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL[alias.toLowerCase()] = lower;
  }
}

// Given a skill string, return its canonical form (lowercased).
// Returns the input lowercased if no synonym is known.
function canonicalize(skill) {
  const lower = skill.toLowerCase().trim();
  return ALIAS_TO_CANONICAL[lower] || lower;
}

// Build a hint string for the analyze prompt so the model knows these
// equivalences before scoring.
function synonymHintBlock() {
  const lines = Object.entries(SYNONYMS).map(
    ([canonical, aliases]) => canonical + ' = ' + aliases.join(', ')
  );
  return lines.join('\n');
}

module.exports = { SYNONYMS, canonicalize, synonymHintBlock };
