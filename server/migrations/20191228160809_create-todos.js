exports.up = function(knex) {
    return knex.schema
        // Create ENUM types first
        .raw(`
            CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');
            CREATE TYPE todo_status AS ENUM ('TODO', 'DOING', 'DONE');
        `)
        
        // Create users table
        .createTable('users', function(table) {
            table.increments('id').primary();
            table.string('name').notNullable();
            table.string('email').notNullable().unique();
            table.string('password_hash').notNullable();
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
        })
        
        // Create organisations table
        .createTable('organisations', function(table) {
            table.increments('id').primary();
            table.string('name').notNullable();
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
        })
        
        // Create user_organisation junction table
        .createTable('user_organisation', function(table) {
            table.integer('user_id').references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
            table.integer('organisation_id').references('id').inTable('organisations').onDelete('CASCADE').onUpdate('CASCADE');
            table.specificType('role', 'user_role').notNullable();
            table.primary(['user_id', 'organisation_id']);
        })
        
        // Create projects table
        .createTable('projects', function(table) {
            table.increments('id').primary();
            table.string('name').notNullable();
            table.text('description');
            table.integer('organisation_id').references('id').inTable('organisations').onDelete('CASCADE').onUpdate('CASCADE');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
        })
        
        // Create todos table
        .createTable('todos', function(table) {
            table.increments('id').primary();
            table.string('title').notNullable();
            table.text('description');
            table.integer('project_id').references('id').inTable('projects').onDelete('CASCADE').onUpdate('CASCADE');
            table.specificType('status', 'todo_status').notNullable().defaultTo('TODO');
            table.timestamp('due_date');
            table.integer('created_by').references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
        })
        
        // Create todo_assignment junction table
        .createTable('todo_assignment', function(table) {
            table.integer('user_id').references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
            table.integer('todo_id').references('id').inTable('todos').onDelete('CASCADE').onUpdate('CASCADE');
            table.primary(['user_id', 'todo_id']);
        })
        
        // Create comments table
        .createTable('comments', function(table) {
            table.increments('id').primary();
            table.text('content').notNullable();
            table.integer('todo_id').references('id').inTable('todos').onDelete('CASCADE').onUpdate('CASCADE');
            table.integer('created_by').references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
        });
};

exports.down = function(knex) {
    return knex.schema
        .dropTableIfExists('comments')
        .dropTableIfExists('todo_assignment')
        .dropTableIfExists('todos')
        .dropTableIfExists('projects')
        .dropTableIfExists('user_organisation')
        .dropTableIfExists('organisations')
        .dropTableIfExists('users')
        .raw(`
            DROP TYPE IF EXISTS todo_status;
            DROP TYPE IF EXISTS user_role;
        `);
};