const request = require("./httpRequests.js");
const knex = require("../../database/connection.js");
const bcrypt = require("bcrypt");

// Clear all test data
async function clearDatabase() {
  await knex("todo_assignment").del();
  await knex("todos").del();
  await knex("projects").del();
  await knex("user_organisation").del();
  await knex("organisations").del();
  await knex("users").del();
}

// Create a test user
async function createUser(userData = {}) {
  const defaultUser = {
    email: `test${Date.now()}@example.com`,
    name: "Test User",
    password: "password123",
  };

  const user = { ...defaultUser, ...userData };

  const response = await request.post("/auth/register", user);
  return response.body;
}

// Create a test organization
async function createOrganisation(orgData = {}) {
  const defaultOrg = {
    name: `Test Organisation ${Date.now()}`,
  };

  const org = { ...defaultOrg, ...orgData };

  // Insert directly into the database
  const [organisation] = await knex("organisations").insert(org).returning("*");
  return organisation;
}

// Add a user to an organization
async function addUserToOrganisation(userId, organisationId, role = "USER") {
  const [userOrg] = await knex("user_organisation")
    .insert({
      user_id: userId,
      organisation_id: organisationId,
      role,
    })
    .returning("*");

  return userOrg;
}

// Create a test project
async function createProject(projectData = {}) {
  const defaultProject = {
    name: `Test Project ${Date.now()}`,
    description: "A test project",
  };

  const project = { ...defaultProject, ...projectData };

  // Project requires an organisation_id
  if (!project.organisation_id) {
    throw new Error("organisation_id is required to create a project");
  }

  const [createdProject] = await knex("projects")
    .insert(project)
    .returning("*");
  return createdProject;
}

// Create a test todo
async function createTodo(todoData = {}) {
  const defaultTodo = {
    title: `Test Todo ${Date.now()}`,
    description: "A test todo",
    status: "TODO",
  };

  const todo = { ...defaultTodo, ...todoData };

  // Todo requires a project_id and created_by
  if (!todo.project_id || !todo.created_by) {
    throw new Error("project_id and created_by are required to create a todo");
  }

  const [createdTodo] = await knex("todos").insert(todo).returning("*");
  return createdTodo;
}

// Login and get auth token
async function loginUser(email, password) {
  const response = await request.post("/auth/login", { email, password });
  return response.body.token;
}

// Create authenticated request helpers
function createAuthenticatedRequests(token) {
  return {
    get: (url) => {
      return request.get(url).set("Authorization", `Bearer ${token}`);
    },
    post: (url, body) => {
      return request
        .post(url)
        .set("Authorization", `Bearer ${token}`)
        .send(body);
    },
    patch: (url, body) => {
      return request
        .patch(url)
        .set("Authorization", `Bearer ${token}`)
        .send(body);
    },
    delete: (url, body) => {
      return request
        .delete(url)
        .set("Authorization", `Bearer ${token}`)
        .send(body);
    },
    put: (url, body) => {
      return request
        .put(url)
        .set("Authorization", `Bearer ${token}`)
        .send(body);
    },
  };
}

module.exports = {
  clearDatabase,
  createUser,
  createOrganisation,
  addUserToOrganisation,
  createProject,
  createTodo,
  loginUser,
  createAuthenticatedRequests,
};
