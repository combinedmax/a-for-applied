// pages/api/videos/[sectionId].js
import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const { sectionId } = req.query;

  // Validate sectionId
  if (!sectionId) {
    return res.status(400).json({ error: "sectionId is required" });
  }

  try {
    // Read video data
    const videosFilePath = path.join(
      process.cwd(),
      "public",
      "data",
      "videos.json"
    );
    const videosData = JSON.parse(fs.readFileSync(videosFilePath, "utf8"));

    // Get videos for the requested section
    const sectionVideos = videosData[sectionId] || [];

    // Return minimal necessary data for listing
    const response = sectionVideos.map((video) => ({
      guid: video.guid,
      title: video.title,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error reading video data:", error);
    res.status(500).json({ error: "Failed to load video data" });
  }
}
