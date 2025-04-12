import jwt from "jsonwebtoken";
import https from "https";

export default async function handler(req, res) {
  const { BUNNY_CDN_URL, BUNNY_AUTH_KEY } = process.env;
  const { sectionId, guid } = req.query;

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

  const token = jwt.sign(
    { exp: Math.floor(Date.now() / 1000) + 21600, v: guid },
    BUNNY_AUTH_KEY
  );

  const resolutionOptions = [
    { quality: "360p", height: 360 },
    { quality: "480p", height: 480 },
    { quality: "720p", height: 720 },
    { quality: "1080p", height: 1080 },
  ];

  // Check Bunny CDN for available resolutions
  const checkUrlExists = (url) => {
    return new Promise((resolve) => {
      https
        .request(url, { method: "HEAD" }, (response) => {
          resolve(response.statusCode === 200);
        })
        .on("error", () => resolve(false))
        .end();
    });
  };

  const securedUrls = [];
  for (const resOption of resolutionOptions) {
    const url = `https://${BUNNY_CDN_URL}/${guid}/${resOption.quality}/video.m3u8?token=${token}`;
    const exists = await checkUrlExists(url);
    if (exists) {
      securedUrls.push({
        quality: resOption.quality,
        height: resOption.height,
        url,
      });
    }
  }

  res.status(200).json({
    title: video.title,
    guid: video.guid,
    securedUrls,
    defaultQuality: securedUrls[0]?.quality || "360p",
  });
}
