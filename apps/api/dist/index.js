"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env from current directory, parent directory, and apps/api directory
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), 'apps/api/.env') });
const invoices_routes_1 = __importDefault(require("./routes/invoices.routes"));
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
const customers_routes_1 = __importDefault(require("./routes/customers.routes"));
const restock_routes_1 = __importDefault(require("./routes/restock.routes"));
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.options('*', (0, cors_1.default)());
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
// Global Error Handler (always returns JSON, never HTML)
app.use((err, req, res, next) => {
    console.error('Unhandled API Error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
