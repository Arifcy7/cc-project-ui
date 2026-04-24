const DEFAULT_API_BASE = (() => {
 const hostname = window.location.hostname;

 if (window.location.protocol === "file:" || hostname === "" || hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:5000/api";
 }

 return "/api";
})();

const API_BASE = window.APP_CONFIG?.API_BASE_URL || DEFAULT_API_BASE;
const POST_TYPES = ["discussion", "question", "resource", "announcement", "event"];
const CATEGORIES = ["General", "AWS", "Cloud", "Docker", "Kubernetes", "DevOps", "Project", "Placement", "Resources"];
const state = {
 currentUser: null,
 pagination: {
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 8
 }
};

function apiUrl(path) {
 return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function getToken() {
 return localStorage.getItem("token") || "";
}

function decodeToken(token) {
 if (!token) {
    return null;
 }

 try {
    const payload = token.split(".")[1];
    if (!payload) {
     return null;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalizedPayload));
 } catch (error) {
    return null;
 }
}

function refreshSession() {
 const token = getToken();
 state.currentUser = decodeToken(token);

 if (token && !state.currentUser) {
    localStorage.removeItem("token");
 }

 return state.currentUser;
}

function isAdmin() {
 return state.currentUser?.role === "admin";
}

function escapeHtml(value) {
 return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(dateValue) {
 if (!dateValue) {
    return "Just now";
 }

 return new Date(dateValue).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
 });
}

function getRequestHeaders(includeAuth = true) {
 const headers = { Accept: "application/json" };
 const token = includeAuth ? getToken() : "";

 if (token) {
    headers.Authorization = `Bearer ${token}`;
 }

 return headers;
}

async function apiFetch(path, options = {}) {
 const { auth = true, body, headers = {}, ...rest } = options;
 const requestHeaders = {
    ...getRequestHeaders(auth),
    ...headers
 };

 let requestBody = body;
 if (body && typeof body !== "string" && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
 }

 const response = await fetch(apiUrl(path), {
    ...rest,
    headers: requestHeaders,
    body: requestBody
 });

 const contentType = response.headers.get("content-type") || "";
 const payload = contentType.includes("application/json") ? await response.json() : await response.text();

 if (!response.ok) {
    const message = payload?.message || payload?.error || "Request failed";
    throw new Error(message);
 }

 return payload;
}

function setMessage(elementId, message, isError = false) {
 const element = document.getElementById(elementId);
 if (!element) {
    return;
 }

 element.textContent = message;
 element.classList.toggle("is-error", isError);
 element.classList.toggle("is-success", !isError);
}

function goToCreate() {
 window.location.href = "create.html";
}

function goToDashboard() {
 window.location.href = "dashboard.html";
}

function goToAdmin() {
 window.location.href = "admin.html";
}

function logout() {
 localStorage.removeItem("token");
 window.location.href = "index.html";
}

function canManagePost(post) {
 return state.currentUser && (state.currentUser.id === post.authorId || isAdmin());
}

function getCategoryOptions(selectedValue = "General") {
 return CATEGORIES.map(category => `<option value="${escapeHtml(category)}" ${category === selectedValue ? "selected" : ""}>${escapeHtml(category)}</option>`).join("");
}

function getPostTypeOptions(selectedValue = "discussion") {
 return POST_TYPES.map(type => `<option value="${escapeHtml(type)}" ${type === selectedValue ? "selected" : ""}>${escapeHtml(type)}</option>`).join("");
}

function renderPostCard(post) {
 const tagsMarkup = Array.isArray(post.tags) && post.tags.length
    ? `<div class="tag-row">${post.tags.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";
 const linkMarkup = post.link
    ? `<a class="resource-link" href="${escapeHtml(post.link)}" target="_blank" rel="noreferrer noopener">Open resource</a>`
    : "";
 const pinBadge = post.isPinned ? `<span class="badge badge--accent">Pinned</span>` : "";
 const actionsMarkup = `
    <div class="post-actions">
     <button class="button button--ghost button--compact" type="button" onclick="upvotePost('${post._id}')">▲ ${post.upvotes || 0}</button>
     <button class="button button--ghost button--compact" type="button" onclick="toggleComments('${post._id}')">Comments</button>
     ${canManagePost(post) ? `<button class="button button--ghost button--compact" type="button" onclick="toggleEditForm('${post._id}')">Edit</button>` : ""}
     ${canManagePost(post) ? `<button class="button button--ghost button--compact" type="button" onclick="deletePost('${post._id}')">Delete</button>` : ""}
     ${isAdmin() ? `<button class="button button--ghost button--compact" type="button" onclick="pinPost('${post._id}')">${post.isPinned ? "Unpin" : "Pin"}</button>` : ""}
    </div>
 `;

 return `
    <article class="post-card ${post.isPinned ? "post-card--pinned" : ""}" data-post-id="${post._id}">
     <div class="post-card__header">
        <div>
         <div class="badge-row">
            <span class="badge">${escapeHtml(post.category || "General")}</span>
            <span class="badge badge--soft">${escapeHtml(post.postType || "discussion")}</span>
            ${pinBadge}
         </div>
         <h3>${escapeHtml(post.title)}</h3>
        </div>
        <div class="post-card__meta">
         <span>${escapeHtml(post.authorName || "Unknown")}</span>
         <span>${escapeHtml(post.authorMID || "")}</span>
         <span>${formatDate(post.createdAt)}</span>
        </div>
     </div>
     <p class="post-card__content">${escapeHtml(post.content)}</p>
     ${linkMarkup}
     ${tagsMarkup}
     ${actionsMarkup}
     <div id="edit-form-${post._id}" class="edit-form hidden">
        <form class="stack-form" onsubmit="savePostEdit(event, '${post._id}')">
         <label>
            Title
            <input id="edit-title-${post._id}" type="text" value="${escapeHtml(post.title)}" required>
         </label>
         <div class="grid grid--two">
            <label>
             Category
             <select id="edit-category-${post._id}">${getCategoryOptions(post.category || "General")}</select>
            </label>
            <label>
             Type
             <select id="edit-type-${post._id}">${getPostTypeOptions(post.postType || "discussion")}</select>
            </label>
         </div>
         <label>
            Resource link
            <input id="edit-link-${post._id}" type="url" value="${escapeHtml(post.link || "")}" placeholder="https://...">
         </label>
         <label>
            Tags
            <input id="edit-tags-${post._id}" type="text" value="${escapeHtml(Array.isArray(post.tags) ? post.tags.join(", ") : "")}" placeholder="cloud, aws, project">
         </label>
         <label>
            Content
            <textarea id="edit-content-${post._id}" rows="5" required>${escapeHtml(post.content)}</textarea>
         </label>
         <div class="action-row">
            <button class="button" type="submit">Save changes</button>
            <button class="button button--ghost" type="button" onclick="toggleEditForm('${post._id}')">Cancel</button>
         </div>
        </form>
     </div>
     <div id="comments-${post._id}" class="comments-panel hidden" data-loaded="false"></div>
    </article>
 `;
}

function renderPagination(pagination) {
 const container = document.getElementById("pagination");
 if (!container) {
    return;
 }

 if (!pagination || pagination.totalPages <= 1) {
    container.innerHTML = "";
    return;
 }

 const { page, totalPages } = pagination;

 container.innerHTML = `
    <div class="pagination-bar">
     <button class="button button--ghost button--compact" type="button" ${page <= 1 ? "disabled" : ""} onclick="loadPosts(${page - 1})">Previous</button>
     <span>Page ${page} of ${totalPages}</span>
     <button class="button button--ghost button--compact" type="button" ${page >= totalPages ? "disabled" : ""} onclick="loadPosts(${page + 1})">Next</button>
    </div>
 `;
}

function renderFeedSummary(pagination) {
 const summary = document.getElementById("feedSummary");
 if (!summary) {
    return;
 }

 if (!pagination) {
    summary.textContent = "";
    return;
 }

 summary.textContent = `${pagination.total} posts across ${pagination.totalPages} page${pagination.totalPages === 1 ? "" : "s"}`;
}

function renderPosts(posts) {
 const postsContainer = document.getElementById("posts");
 if (!postsContainer) {
    return;
 }

 if (!posts.length) {
    postsContainer.innerHTML = `
     <div class="empty-state">
        <h3>No posts found</h3>
        <p>Try a different search, or create the first post in this topic.</p>
     </div>
    `;
    return;
 }

 postsContainer.innerHTML = posts.map(renderPostCard).join("");
}

async function loadPosts(page = 1) {
 const postsContainer = document.getElementById("posts");
 if (!postsContainer) {
    return;
 }

 const search = document.getElementById("searchInput")?.value.trim() || "";
 const category = document.getElementById("categoryFilter")?.value || "";
 const postType = document.getElementById("typeFilter")?.value || "";
 const mine = document.getElementById("mineFilter")?.checked ? "true" : "false";
 const limit = document.getElementById("pageSize")?.value || "8";

 state.pagination.page = page;

 postsContainer.innerHTML = `<div class="state-message">Loading posts...</div>`;

 try {
    const query = new URLSearchParams({ page: String(page), limit, mine });

    if (search) {
     query.set("search", search);
    }

    if (category) {
     query.set("category", category);
    }

    if (postType) {
     query.set("postType", postType);
    }

    const data = await apiFetch(`/posts?${query.toString()}`);
    renderPosts(data.posts || []);
    renderPagination(data.pagination);
    renderFeedSummary(data.pagination);
    state.pagination = data.pagination || state.pagination;
 } catch (error) {
    postsContainer.innerHTML = `<div class="state-message is-error">${escapeHtml(error.message)}</div>`;
 }
}

function toggleEditForm(postId) {
 const form = document.getElementById(`edit-form-${postId}`);
 if (!form) {
    return;
 }

 form.classList.toggle("hidden");
}

async function savePostEdit(event, postId) {
 event.preventDefault();

 const payload = {
    title: document.getElementById(`edit-title-${postId}`)?.value || "",
    category: document.getElementById(`edit-category-${postId}`)?.value || "General",
    postType: document.getElementById(`edit-type-${postId}`)?.value || "discussion",
    link: document.getElementById(`edit-link-${postId}`)?.value || "",
    tags: document.getElementById(`edit-tags-${postId}`)?.value || "",
    content: document.getElementById(`edit-content-${postId}`)?.value || ""
 };

 try {
    await apiFetch(`/posts/${postId}`, {
     method: "PUT",
     body: payload
    });

    await loadPosts(state.pagination.page || 1);
 } catch (error) {
    alert(error.message);
 }
}

async function deletePost(postId) {
 if (!confirm("Delete this post?")) {
    return;
 }

 try {
    await apiFetch(`/posts/${postId}`, {
     method: "DELETE"
    });

    await loadPosts(state.pagination.page || 1);
 } catch (error) {
    alert(error.message);
 }
}

async function upvotePost(postId) {
 try {
    await apiFetch(`/posts/${postId}/upvote`, {
     method: "PUT"
    });

    await loadPosts(state.pagination.page || 1);
 } catch (error) {
    alert(error.message);
 }
}

async function pinPost(postId) {
 if (!isAdmin()) {
    return;
 }

 try {
    await apiFetch(`/posts/${postId}/pin`, {
     method: "PATCH"
    });

    await loadPosts(state.pagination.page || 1);
 } catch (error) {
    alert(error.message);
 }
}

function renderCommentsSkeleton(postId) {
 return `
    <div class="comments-shell">
     <div class="comments-shell__head">
        <h4>Discussion</h4>
        <button class="button button--ghost button--compact" type="button" onclick="toggleComments('${postId}')">Hide</button>
     </div>
     <div class="state-message">Loading comments...</div>
    </div>
 `;
}

function renderCommentsSection(postId, comments) {
 const currentUserId = state.currentUser?.id;
 const commentsMarkup = comments.length
    ? comments.map(comment => {
     const canDelete = currentUserId === comment.authorId || isAdmin();
     return `
        <article class="comment-card">
         <div class="comment-card__meta">
            <strong>${escapeHtml(comment.authorName || "Member")}</strong>
            <span>${formatDate(comment.createdAt)}</span>
         </div>
         <p>${escapeHtml(comment.content)}</p>
         ${canDelete ? `<button class="button button--ghost button--compact" type="button" onclick="deleteComment('${comment._id}', '${postId}')">Delete</button>` : ""}
        </article>
     `;
    }).join("")
    : `<div class="empty-state empty-state--compact"><p>No comments yet. Start the discussion.</p></div>`;

 return `
    <div class="comments-shell">
     <div class="comments-shell__head">
        <h4>Discussion</h4>
        <button class="button button--ghost button--compact" type="button" onclick="toggleComments('${postId}')">Hide</button>
     </div>
     <div class="comments-list">${commentsMarkup}</div>
     <form class="comment-form" onsubmit="submitComment(event, '${postId}')">
        <textarea id="comment-input-${postId}" rows="3" placeholder="Write a thoughtful comment" required></textarea>
        <div class="action-row">
         <button class="button button--compact" type="submit">Post comment</button>
        </div>
     </form>
    </div>
 `;
}

async function toggleComments(postId) {
 const panel = document.getElementById(`comments-${postId}`);
 if (!panel) {
    return;
 }

 const isVisible = !panel.classList.contains("hidden");
 if (isVisible) {
    panel.classList.add("hidden");
    return;
 }

 panel.classList.remove("hidden");
 panel.innerHTML = renderCommentsSkeleton(postId);

 try {
    const comments = await apiFetch(`/comments/${postId}`, { auth: false });
    panel.dataset.loaded = "true";
    panel.innerHTML = renderCommentsSection(postId, comments);
 } catch (error) {
    panel.innerHTML = `<div class="state-message is-error">${escapeHtml(error.message)}</div>`;
 }
}

async function submitComment(event, postId) {
 event.preventDefault();

 const input = document.getElementById(`comment-input-${postId}`);
 const content = input?.value.trim();

 if (!content) {
    return;
 }

 try {
    await apiFetch(`/comments/${postId}`, {
     method: "POST",
     body: { content }
    });

    await toggleComments(postId);
    await toggleComments(postId);
 } catch (error) {
    alert(error.message);
 }
}

async function deleteComment(commentId, postId) {
 if (!confirm("Delete this comment?")) {
    return;
 }

 try {
    await apiFetch(`/comments/${commentId}`, {
     method: "DELETE"
    });

    await toggleComments(postId);
    await toggleComments(postId);
 } catch (error) {
    alert(error.message);
 }
}

async function createPost(event) {
 if (event) {
    event.preventDefault();
 }

 const payload = {
    title: document.getElementById("title")?.value || "",
    category: document.getElementById("category")?.value || "General",
    postType: document.getElementById("postType")?.value || "discussion",
    link: document.getElementById("link")?.value || "",
    tags: document.getElementById("tags")?.value || "",
    content: document.getElementById("content")?.value || ""
 };

 try {
    await apiFetch("/posts", {
     method: "POST",
     body: payload
    });

    window.location.href = "dashboard.html";
 } catch (error) {
    const message = document.getElementById("msg");
    if (message) {
     message.textContent = error.message;
    } else {
     alert(error.message);
    }
 }
}

async function login(event) {
 if (event) {
    event.preventDefault();
 }

 const MID = document.getElementById("MID")?.value.trim() || "";
 const password = document.getElementById("password")?.value || "";
 const email = `${MID}@apsit.edu.in`;

 try {
    const data = await apiFetch("/auth/login", {
     method: "POST",
     auth: false,
     body: { email, password }
    });

    localStorage.setItem("token", data.token);
    refreshSession();
    window.location.href = "dashboard.html";
 } catch (error) {
    setMessage("msg", error.message, true);
 }
}

async function register(event) {
 if (event) {
    event.preventDefault();
 }

 const payload = {
    name: document.getElementById("name")?.value || "",
    MID: document.getElementById("MID")?.value.trim() || "",
    password: document.getElementById("password")?.value || ""
 };

 try {
    const data = await apiFetch("/auth/register", {
     method: "POST",
     auth: false,
     body: payload
    });

    setMessage("msg", data.message || "Registration complete. Wait for approval.", false);
 } catch (error) {
    setMessage("msg", error.message, true);
 }
}

async function loadUsers() {
 const usersContainer = document.getElementById("users");
 if (!usersContainer) {
    return;
 }

 usersContainer.innerHTML = `<div class="state-message">Loading users...</div>`;

 try {
    const users = await apiFetch("/admin/users");

    if (!users.length) {
     usersContainer.innerHTML = `<div class="empty-state"><p>No users found.</p></div>`;
     return;
    }

    const pendingCount = users.filter(user => !user.isApproved).length;
    const summary = document.getElementById("adminSummary");
    if (summary) {
     summary.textContent = `${users.length} users total, ${pendingCount} pending approval`;
    }

    usersContainer.innerHTML = users.map(user => `
     <article class="user-card">
        <div>
         <div class="badge-row">
            <span class="badge">${escapeHtml(user.role || "student")}</span>
            <span class="badge ${user.isApproved ? "badge--soft" : "badge--accent"}">${user.isApproved ? "Approved" : "Pending"}</span>
         </div>
         <h3>${escapeHtml(user.name)}</h3>
         <p>${escapeHtml(user.MID)} · ${escapeHtml(user.email)}</p>
        </div>
        <div class="post-actions">
         ${!user.isApproved ? `<button class="button button--compact" type="button" onclick="approveUser('${user._id}')">Approve</button>` : ""}
         <button class="button button--ghost button--compact" type="button" onclick="deleteUser('${user._id}')">Remove</button>
        </div>
     </article>
    `).join("");
 } catch (error) {
    usersContainer.innerHTML = `<div class="state-message is-error">${escapeHtml(error.message)}</div>`;
 }
}

async function approveUser(id) {
 try {
    const data = await apiFetch(`/admin/approve/${id}`, {
     method: "PUT"
    });

    alert(data.message);
    await loadUsers();
 } catch (error) {
    alert(error.message);
 }
}

async function deleteUser(id) {
 if (!confirm("Remove this user?")) {
    return;
 }

 try {
    const data = await apiFetch(`/admin/remove/${id}`, {
     method: "DELETE"
    });

    alert(data.message);
    await loadUsers();
 } catch (error) {
    alert(error.message);
 }
}

function bootstrapProtectedPage(adminOnly = false) {
 refreshSession();

 if (!state.currentUser) {
    window.location.href = "index.html";
    return false;
 }

 if (adminOnly && !isAdmin()) {
    window.location.href = "dashboard.html";
    return false;
 }

 return true;
}

function initDashboardPage() {
 if (!bootstrapProtectedPage(false)) {
    return;
 }

 const welcome = document.getElementById("welcomeText");
 if (welcome) {
    welcome.textContent = `Welcome, ${state.currentUser?.name || "member"}`;
 }

 const adminButton = document.getElementById("adminNavButton");
 if (adminButton) {
    adminButton.classList.toggle("hidden", !isAdmin());
 }

 loadPosts(1);
}

function initCreatePage() {
 if (!bootstrapProtectedPage(false)) {
    return;
 }

 const owner = document.getElementById("composerOwner");
 if (owner) {
    owner.textContent = `Posting as ${state.currentUser?.name || "member"}`;
 }

 const adminButton = document.getElementById("adminNavButton");
 if (adminButton) {
    adminButton.classList.toggle("hidden", !isAdmin());
 }
}

function initAdminPage() {
 if (!bootstrapProtectedPage(true)) {
    return;
 }

 const adminButton = document.getElementById("adminNavButton");
 if (adminButton) {
    adminButton.classList.add("hidden");
 }

 loadUsers();
}

document.addEventListener("DOMContentLoaded", () => {
 const page = document.body.dataset.page;

 refreshSession();

 if ((page === "login" || page === "register") && state.currentUser) {
    window.location.href = "dashboard.html";
    return;
 }

 if (page === "dashboard") {
    initDashboardPage();
 }

 if (page === "create") {
    initCreatePage();
 }

 if (page === "admin") {
    initAdminPage();
 }
});