const app = require('./server-config.js');
const routes = require('./server-routes.js');
const TodoRouter = require('./routes/todos.js');
const ProjectRouter = require('./routes/projects.js');
const AuthRouter = require('./routes/auth.js');
const { isLoggedInMiddleware } = require('./middleware/auth.js');
const port = process.env.PORT || 5000;

// app.get('/', routes.getAllTodos);
// app.get('/:id', routes.getTodo);

// app.post('/', routes.postTodo);
// app.patch('/:id', routes.patchTodo);

// app.delete('/', routes.deleteAllTodos);
// app.delete('/:id', routes.deleteTodo);

app.use('/todos', TodoRouter);
app.use('/projects', isLoggedInMiddleware, ProjectRouter);
app.use('/auth', AuthRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`Listening on port ${port}`));
}

module.exports = app;