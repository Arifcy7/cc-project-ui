window.APP_CONFIG = window.APP_CONFIG || {};

// Auto-detect API base URL based on environment
window.APP_CONFIG.API_BASE_URL = window.APP_CONFIG.API_BASE_URL || (() => {
 const hostname = window.location.hostname;

 // Local development: use localhost backend on port 5000
 if (hostname === "localhost" || hostname === "127.0.0.1") {
  //return "http://localhost:5000/api";
   return "https://cc-project-backend-arif-1087198500900.europe-west1.run.app/api";

 }

 // Production: use deployed backend URL
 return "https://cc-project-backend-arif-1087198500900.europe-west1.run.app/api";
})();