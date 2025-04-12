import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const { BUNNY_CDN_URL, BUNNY_AUTH_KEY } = process.env;
  const { sectionId, guid } = req.query;

  // Read video data
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

  // Generate token (4 hour validity)
  const token = jwt.sign(
    { exp: Math.floor(Date.now() / 1000) + 21600, v: guid },
    BUNNY_AUTH_KEY
  );

  // Define potential resolutions
  const resolutionOptions = [
    { quality: "360p", height: 360 },
    { quality: "480p", height: 480 },
    { quality: "720p", height: 720 },
    { quality: "1080p", height: 1080 },
  ];

  // Check which video resolutions actually exist
  const availableResolutions = resolutionOptions
    .filter((res) => {
      const localFilePath = path.join(
        process.cwd(),
        "public",
        "videos", // Make sure this matches your actual local video directory
        guid,
        res.quality,
        "video.m3u8"
      );
      return fs.existsSync(localFilePath);
    })
    .map((res) => ({
      quality: res.quality,
      height: res.height,
      url: `https://${BUNNY_CDN_URL}/${guid}/${res.quality}/video.m3u8?token=${token}`,
    }));

  res.status(200).json({
    title: video.title,
    guid: video.guid,
    securedUrls: availableResolutions,
    defaultQuality: availableResolutions[0]?.quality || "360p",
  });
}
