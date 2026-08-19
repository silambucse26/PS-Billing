"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const invoices_routes_1 = __importDefault(require("./routes/invoices.routes"));
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
const customers_routes_1 = __importDefault(require("./routes/customers.routes"));
const restock_routes_1 = __importDefault(require("./routes/restock.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Universal CORS handler
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Routes
app.use('/api/invoices', invoices_routes_1.default);
app.use('/api/reports', reports_routes_1.default);
app.use('/api/customers', customers_routes_1.default);
app.use('/api/restock', restock_routes_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'PashuCentral Billing API' });
});
// 404 JSON Handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});
// Global Error Handler (always returns JSON with CORS headers)
app.use((err, req, res, next) => {
    console.error('Unhandled API Error:', err);
    res.header('Access-Control-Allow-Origin', '*');
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
