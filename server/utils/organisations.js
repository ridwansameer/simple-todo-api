const knex = require("../database/connection.js");

const isUserInOrganisationOfProject = async (projectId, userId) => {
  const project = await knex("projects").where({ id: projectId }).first();
  const organisation_id = project.organisation_id;
  const user = await knex("user_organisation")
    .where({ user_id: userId, organisation_id })
    .first();
  return !!user;
};

const isUserInOrganisation = async (organisationId, userId) => {
  const user = await knex("user_organisation")
    .where({ user_id: userId, organisation_id: organisationId })
    .first();
  return !!user;
};

const isUserAdminOfOrganisation = async (organisationId, userId) => {
  const user = await knex("user_organisation")
    .where({ user_id: userId, organisation_id: organisationId, role: "ADMIN" })
    .first();
  return !!user;
};

module.exports = {
  isUserInOrganisationOfProject,
  isUserInOrganisation,
  isUserAdminOfOrganisation,
};
