export const terminalStates = [
  { content: `{
  "name": "SUCHIT GOURKHEDE",
  "status": "ONLINE",
  "role": "BACKEND / API ENGINEER",
  "focus": [
    "API ENGINEERING",
    "API SECURITY",
    "DISTRIBUTED SYSTEMS",
    "SYSTEM DESIGN"
  ]
}` },
  { content: `{
  "backend": ["NODE.JS", "EXPRESS.JS", "JAVA"],
  "distributed": [
    "KAFKA", "REDIS", "MICROSERVICES"
  ],
  "api": ["APIGEE", "REST", "OPENAPI"]
}` },
  { content: `REQUEST -> API GATEWAY -> SERVICE
              |              |
              v              +-> REDIS
       AUTH / VALIDATION      +-> KAFKA
       RATE LIMITING          +-> DATABASE

FOCUS: RELIABLE_SERVICE_BOUNDARIES` },
  { content: `{
  "genai_engineering": [
    "RAG", "AI AGENTS", "LLM APIS",
    "EMBEDDINGS", "SEMANTIC SEARCH"
  ]
}` }
];

export const logMessages = ['profile loaded', 'API engineering context ready', 'architecture concepts indexed', 'module registry synced', 'project catalogue loaded', 'system online'];
