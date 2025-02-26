process.env.NODE_ENV = "test";
const request = require("./util/httpRequests.js");
const {
  clearDatabase,
  createUser,
  createOrganisation,
  addUserToOrganisation,
  createProject,
  createAuthenticatedRequests,
} = require("./util/testHelpers.js");
const knex = require("../database/connection.js");

describe("Organisations API", () => {
  let users, organisations, authToken, authRequest;

  beforeEach(async () => {
    await clearDatabase();

    // Create test users
    const userData1 = {
      email: "org-test1@example.com",
      name: "Org Test User 1",
      password: "password123",
    };
    const userData2 = {
      email: "org-test2@example.com",
      name: "Org Test User 2",
      password: "password123",
    };

    const userResponse1 = await createUser(userData1);
    const userResponse2 = await createUser(userData2);

    users = [userResponse1.user, userResponse2.user];
    authToken = userResponse1.token;

    // Create authenticated request helper
    authRequest = createAuthenticatedRequests(authToken);

    // Create organisations
    organisations = [
      await createOrganisation({ name: "Test Organisation 1" }),
      await createOrganisation({ name: "Test Organisation 2" }),
    ];

    // Add first user to both organisations
    await addUserToOrganisation(users[0].id, organisations[0].id, "ADMIN");
    await addUserToOrganisation(users[0].id, organisations[1].id, "USER");

    // Add second user to only the second organisation
    await addUserToOrganisation(users[1].id, organisations[1].id, "USER");
  });

  afterAll(async () => {
    await clearDatabase();
    await knex.destroy();
  });

  describe("GET /organisations", () => {
    it("should get organisations that the user is a part of", async () => {
      const response = await authRequest.get("/organisations");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      // Check that the organisations have the expected properties
      const orgNames = response.body.map((org) => org.name);
      expect(orgNames).toContain(organisations[0].name);
      expect(orgNames).toContain(organisations[1].name);
    });
  });

  describe("GET /organisations/:id", () => {
    it("should get details of an organisation", async () => {
      const response = await authRequest.get(
        `/organisations/${organisations[0].id}`
      );

      expect(response.status).toBe(200);
      // Fix: The response is an array with a single organisation object
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty("id", organisations[0].id);
      expect(response.body[0]).toHaveProperty("name", organisations[0].name);
    });

    it("should return 401 if user is not part of the organisation", async () => {
      // Create a new organisation that the user is not part of
      const newOrg = await createOrganisation({
        name: "Restricted Organisation",
      });

      const response = await authRequest.get(`/organisations/${newOrg.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /organisations", () => {
    it("should create a new organisation and return it", async () => {
      const orgData = {
        name: "New Test Organisation",
      };

      const response = await authRequest.post("/organisations", orgData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", orgData.name);

      // Verify the organisation was created in the database
      const org = await knex("organisations")
        .where({ id: response.body.id })
        .first();
      expect(org).toBeTruthy();
      expect(org.name).toBe(orgData.name);

      // Verify the user was added to the organisation
      const userOrg = await knex("user_organisation")
        .where({
          user_id: users[0].id,
          organisation_id: response.body.id,
        })
        .first();
      expect(userOrg).toBeTruthy();
      expect(userOrg.role).toBe("ADMIN");
    });
  });

  describe("PATCH /organisations/:id", () => {
    it("should update the organisation name", async () => {
      const updateData = {
        name: "Updated Organisation Name",
      };

      const response = await authRequest.patch(
        `/organisations/${organisations[0].id}`,
        updateData
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", organisations[0].id);
      expect(response.body).toHaveProperty("name", updateData.name);

      // Verify the name was updated in the database
      const org = await knex("organisations")
        .where({ id: organisations[0].id })
        .first();
      expect(org.name).toBe(updateData.name);
    });
  });

  describe("DELETE /organisations/:id", () => {
    it("should delete the organisation", async () => {
      const response = await authRequest.delete(
        `/organisations/${organisations[0].id}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Organisation deleted");

      // Verify the organisation was deleted from the database
      const org = await knex("organisations")
        .where({ id: organisations[0].id })
        .first();
      expect(org).toBeUndefined();

      // Verify user-organisation relationships were deleted
      const userOrg = await knex("user_organisation")
        .where({ organisation_id: organisations[0].id })
        .first();
      expect(userOrg).toBeUndefined();
    });
  });

  describe("GET /organisations/:id/projects", () => {
    it("should get all projects for a particular organisation", async () => {
      // Create some test projects for the organisation
      const projects = [
        await createProject({
          name: "Project 1",
          description: "Description for Project 1",
          organisation_id: organisations[0].id,
        }),
        await createProject({
          name: "Project 2",
          description: "Description for Project 2",
          organisation_id: organisations[0].id,
        }),
      ];

      const response = await authRequest.get(
        `/organisations/${organisations[0].id}/projects`
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });
  });

  describe("POST /organisations/:id/projects", () => {
    it("should create a project for a particular organisation", async () => {
      const projectData = {
        name: "New Test Project",
        description: "Description for the new test project",
      };

      const response = await authRequest.post(
        `/organisations/${organisations[0].id}/projects`,
        projectData
      );

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", projectData.name);

      // Verify the project was created in the database
      const project = await knex("projects")
        .where({ id: response.body.id })
        .first();

      expect(project).toBeTruthy();
      expect(project.name).toBe(projectData.name);
    });
  });

  describe("GET /organisations/:id/members", () => {
    it("should get a list of users who are a part of this organisation", async () => {
      // Add another user to the first organisation for testing
      const userData3 = {
        email: "org-test3@example.com",
        name: "Org Test User 3",
        password: "password123",
      };
      const userResponse3 = await createUser(userData3);
      await addUserToOrganisation(
        userResponse3.user.id,
        organisations[0].id,
        "USER"
      );

      const response = await authRequest.get(
        `/organisations/${organisations[0].id}/members`
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2); // First user and third user
    });
  });

  describe("POST /organisations/:id/members", () => {
    it("should add a user to this organisation", async () => {
      // Create a new user to add to the organisation
      const userData3 = {
        email: "new-member@example.com",
        name: "New Member",
        password: "password123",
      };
      const userResponse3 = await createUser(userData3);

      const memberData = {
        user_id: userResponse3.user.id,
        role: "USER",
      };

      const response = await authRequest.post(
        `/organisations/${organisations[0].id}/members`,
        memberData
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "User added successfully"
      );

      // Verify the user was added to the organisation in the database
      const userOrg = await knex("user_organisation")
        .where({
          user_id: userResponse3.user.id,
          organisation_id: organisations[0].id,
        })
        .first();

      expect(userOrg).toBeTruthy();
      expect(userOrg.role).toBe("USER");
    });
  });

  describe("PUT /organisations/:id/members", () => {
    it("should edit the role of a user in the organisation", async () => {
      const updateData = {
        user_id: users[1].id,
        role: "ADMIN",
      };

      const response = await authRequest.put(
        `/organisations/${organisations[1].id}/members`,
        updateData
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "User updated successfully"
      );

      // Verify the role was updated in the database
      const userOrg = await knex("user_organisation")
        .where({
          user_id: users[1].id,
          organisation_id: organisations[1].id,
        })
        .first();

      expect(userOrg).toBeTruthy();
      expect(userOrg.role).toBe("ADMIN");
    });
  });

  describe("DELETE /organisations/:id/members", () => {
    it("should remove a user from the organisation", async () => {
      const deleteData = {
        user_id: users[1].id,
      };

      const response = await authRequest.delete(
        `/organisations/${organisations[1].id}/members`,
        deleteData
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "User deleted successfully"
      );

      // Verify the user was removed from the organisation in the database
      const userOrg = await knex("user_organisation")
        .where({
          user_id: users[1].id,
          organisation_id: organisations[1].id,
        })
        .first();

      expect(userOrg).toBeUndefined();
    });
  });
});
