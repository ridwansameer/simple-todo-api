const OrganisationRouter = require("express").Router();
const knex = require("../database/connection");
const {
  isUserInOrganisation,
  isUserAdminOfOrganisation,
} = require("../utils/organisations.js");
const z = require("zod");

OrganisationRouter.get("/", async (req, res) => {
  const { user } = req;
  const userOrganisations = await knex("user_organisation")
    .where({
      user_id: user.id,
    })
    .select("organisation_id");
  const organisations = await knex("organisations").whereIn(
    "id",
    userOrganisations.map((organisation) => organisation.organisation_id)
  );
  res.status(200).json(organisations);
});

OrganisationRouter.get("/:id", async (req, res) => {
  const { id: organisationId } = req.params;
  const { user } = req;
  const userInOrganisation = await isUserInOrganisation(
    organisationId,
    user.id
  );

  if (!userInOrganisation) {
    return res.status(401).json({ error: "User is not in the organisation" });
  }

  const organisation = await knex("organisations").where({
    id: organisationId,
  });
  res.status(200).json(organisation);
});

OrganisationRouter.post("/", async (req, res) => {
  try {
    const { user } = req;
    const { name } = organisationSchema.parse(req.body);
    await knex.transaction(async (trx) => {
      const organisation = await trx("organisations")
        .insert({
          name,
        })
        .returning("*");
      await trx("user_organisation").insert({
        user_id: user.id,
        organisation_id: organisation[0].id,
        role: "ADMIN",
      });
      res.status(201).json(organisation[0]);
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

OrganisationRouter.patch("/:id", async (req, res) => {
  try {
    const { id: organisationId } = req.params;
    const { user } = req;
    const { name } = organisationSchema.parse(req.body);
    const organisation = await knex("organisations").where({
      id: organisationId,
    });
    if (!organisation) {
      return res.status(404).json({ error: "Organisation not found" });
    }
    const updatedOrganisation = await knex("organisations")
      .where({ id: organisationId })
      .update({
        name,
      })
      .returning("*");
    res.status(200).json(updatedOrganisation[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

OrganisationRouter.delete("/:id", async (req, res) => {
  try {
    const { id: organisationId } = req.params;
    const { user } = req;
    const isUserAdmin = await isUserAdminOfOrganisation(
      organisationId,
      user.id
    );
    if (!isUserAdmin) {
      return res.status(403).json({ error: "User is not an admin" });
    }
    await knex("organisations")
      .where({
        id: organisationId,
      })
      .del();
    res.status(200).json({ message: "Organisation deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

OrganisationRouter.get("/:id/projects", async (req, res) => {
  const { id: organisationId } = req.params;
  const projects = await knex("projects").where({
    organisation_id: organisationId,
  });
  res.status(200).json(projects);
});

OrganisationRouter.post("/:id/projects", async (req, res) => {
  const { id: organisationId } = req.params;
  const { name, description } = projectSchema.parse(req.body);
  const project = await knex("projects")
    .insert({
      name,
      organisation_id: organisationId,
      description,
    })
    .returning("*");
  res.status(201).json(project[0]);
});

OrganisationRouter.get("/:id/members", async (req, res) => {
  const { id: organisationId } = req.params;
  const members = await knex("user_organisation").where({
    organisation_id: organisationId,
  });
  res.status(200).json(members);
});

OrganisationRouter.post("/:id/members", async (req, res) => {
  try {
    const { id: organisationId } = req.params;
    const { user_id, role } = memberSchema.parse(req.body);
    const member = await knex("user_organisation").insert({
      user_id,
      organisation_id: organisationId,
      role,
    });
    res.status(200).json({ message: "User added successfully" });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});

OrganisationRouter.put("/:id/members/", async (req, res) => {
  const { id: organisationId } = req.params;
  const { user_id, role } = memberSchema.parse(req.body);
  const member = await knex("user_organisation")
    .where({
      user_id,
      organisation_id: organisationId,
    })
    .update({ role });
  res.status(200).json({ message: "User updated successfully" });
});

OrganisationRouter.delete("/:id/members", async (req, res) => {
  const { id: organisationId } = req.params;
  const { user_id } = deleteMemberSchema.parse(req.body);
  await knex("user_organisation")
    .where({
      user_id,
      organisation_id: organisationId,
    })
    .del();
  res.status(200).json({ message: "User deleted successfully" });
});

const organisationSchema = z.object({
  name: z.string().min(1),
});

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).optional(),
});

const memberSchema = z.object({
  user_id: z.coerce.string().min(1),
  role: z.string().min(1),
});

const deleteMemberSchema = z.object({
  user_id: z.coerce.string().min(1),
});

module.exports = OrganisationRouter;
