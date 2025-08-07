const express = require('express');

const userRoutes = require('./modules/user/routes');
const authRoutes = require('./modules/auth/routes');
const businessRoutes = require('./modules/business/routes');
const activityRoutes = require('./modules/activity/routes');
const askRoutes = require('./modules/aiChat/routes');
const chatRoutes = require('./modules/chat/routes');
const knowledgeRoutes = require('./modules/knowledge/routes');
const escalationRoutes = require('./modules/escalation/routes');
const sessionRoutes = require('./modules/session/routes');
const notesRoutes = require('./modules/notes/routes');
const emailRoutes = require('./modules/email/routes');
const categoryRoutes = require('./modules/category/routes');
const faqRoutes = require('./modules/faq/routes');
const policyRoutes = require('./modules/policy/routes');
const serviceRoutes = require('./modules/service/routes');
const productRoutes = require('./modules/product/routes');
const agentRoutes = require('./modules/agent/routes');  
const queueRoutes = require('./modules/queue');
const fileRoutes = require('./modules/file/routes');

const api = express.Router();

api.use('/auth', authRoutes);
api.use('/user', userRoutes);
api.use('/business', businessRoutes);
api.use('/activity', activityRoutes);
api.use('/ask', askRoutes);
api.use('/chat', chatRoutes);
api.use('/knowledge', knowledgeRoutes);
api.use('/escalation', escalationRoutes);
api.use('/session', sessionRoutes);
api.use('/notes', notesRoutes);
api.use('/email', emailRoutes);
api.use('/category', categoryRoutes);
api.use('/faq', faqRoutes);
api.use('/policy', policyRoutes);
api.use('/service', serviceRoutes);
api.use('/product', productRoutes);
api.use('/agent', agentRoutes);  
api.use('/queue', queueRoutes);  
api.use('/file', fileRoutes);  

module.exports = api;
