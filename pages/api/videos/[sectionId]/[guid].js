import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import https from "https";

export default async function handler(req, res) {
  const { BUNNY_CDN_URL, BUNNY_AUTH_KEY } = process.env;
  const { sectionId, guid } = req.query;

  // Read video data from JSON file
  const videosFilePath = path.join(
    process.cwd(),
    "public",
    "data",
    "videos.json"
  );
  const videosData = JSON.parse(fs.readFileSync(videosFilePath, "utf8"));
  const videos = videosData[sectionId] || [];
  const video = videos.find((v) => v.guid === guid);

  if (!video) {
    return res.status(404).json({ error: "Video not found" });
  }

  // Generate token
  const token = jwt.sign(
    { exp: Math.floor(Date.now() / 1000) + 3600, v: guid },
    BUNNY_AUTH_KEY
  );

  // Possible resolutions Bunny.net might create
  const possibleResolutions = [
    { quality: "144p", height: 144 },
    { quality: "240p", height: 240 },
    { quality: "360p", height: 360 },
    { quality: "480p", height: 480 },
    { quality: "720p", height: 720 },
    { quality: "1080p", height: 1080 },
  ];

  // Function to check if a resolution exists
  const checkResolutionExists = (quality) => {
    return new Promise((resolve) => {
      const url = `https://${BUNNY_CDN_URL}/${guid}/${quality}/video.m3u8?token=${token}`;

      https
        .get(url, (response) => {
          // If status code is 200, resolution exists
          if (response.statusCode === 200) {
            response.resume(); // Drain the response
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .on("error", () => {
          resolve(false);
        });
    });
  };

  // Check which resolutions actually exist
  const availableResolutions = [];
  for (const res of possibleResolutions) {
    const exists = await checkResolutionExists(res.quality);
    if (exists) {
      availableResolutions.push({
        quality: res.quality,
        height: res.height,
        url: `https://${BUNNY_CDN_URL}/${guid}/${res.quality}/video.m3u8?token=${token}`,
      });
    }
  }

  // If no resolutions found, check if original exists
  if (availableResolutions.length === 0) {
    const originalExists = await checkResolutionExists("original");
    if (originalExists) {
      availableResolutions.push({
        quality: "original",
        height: null,
        url: `https://${BUNNY_CDN_URL}/${guid}/original/video.m3u8?token=${token}`,
      });
    }
  }

  if (availableResolutions.length === 0) {
    return res.status(404).json({ error: "No available resolutions found" });
  }

  // Sort by quality (ascending)
  availableResolutions.sort((a, b) => a.height - b.height);

  // Set default to lowest available quality
  const defaultQuality = availableResolutions[0].quality;

  res.status(200).json({
    title: video.title,
    guid: video.guid,
    securedUrls: availableResolutions,
    defaultQuality,
  });
}
