import * as express from 'express';
import * as fb from './fb';
import * as fish from './fish';
import * as config from './config';

const webhookHandler = fb.webhookHandler();

const app = express();
app.use((req, res, next) => {
    console.log(req.method, req.path);
    next();
});
app.use('/fb', webhookHandler);
app.use('/img', express.static(__dirname + '/img'));
app.get('/fish', (req, res) => {
    res.send(`
    <form method="post">
        <input type="file" />
        <input type="submit" />
    </form>
    `)
});
app.post('/fish', (req, res) => {
    fish.getFish('anything').then(fish => {
        res.send(`${fish.name}`);
    });
});

if(require.main == module) {
    fb.setupProfile();
    app.listen(config.webApp.port, () => {
        console.log(`Running on ${config.webApp.port}`);
    });
}