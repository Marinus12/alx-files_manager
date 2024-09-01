import express from 'express';
import bodyParser from 'body-parser';
import routes from './routes/index';

const app = express();
const port = process.env.PORT || 5000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

app.use('/', routes);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

export default app;
