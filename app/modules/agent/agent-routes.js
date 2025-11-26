const express = require("express");
const router = express.Router();
const agentController = require("./agent-controller");
const statusRoutes = require("./agent-status-controller");
const { getAgentStats } = require("../queue/queue-controller");
const { upload } = require("../../services/fileUploadService");

// Get Agent info using token
router.get("/info", agentController.getAgentInfo);
// Update agent's own profile
router.put("/profile", agentController.updateAgentProfile);
// Change agent's password
router.post("/change-password", agentController.changePassword);
// Upload/update profile picture
router.post(
  "/profile-picture",
  upload.single("profilePicture"),
  agentController.uploadProfilePicture
);
// Delete profile picture
router.delete("/profile-picture", agentController.deleteProfilePicture);
// Get agent statistics
router.get("/:agentId/stats", getAgentStats);
// Create agent
router.post("/", agentController.createAgent);
// Get all agents (optionally by business)
router.get("/", agentController.getAgents);

// Search agents by name (for case owner selection)
router.get("/search", agentController.searchAgents);
// Get agents by business ID (specific route to avoid conflict)
router.get("/business/:businessId", agentController.getAgentsByBusiness);
// Get agent by ID
router.get("/:id", agentController.getAgentById);
// Update agent
router.put("/:id", agentController.updateAgent);
// Delete agent
router.delete("/:id", agentController.deleteAgent);
// Restore agent
router.patch("/:id/restore", agentController.restoreAgent);

// Status routes
router.use("/", statusRoutes);

module.exports = router;
