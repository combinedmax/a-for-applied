// [guid].js
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
	const { BUNNY_CDN_URL, BUNNY_AUTH_KEY } = process.env;
	const { sectionId, guid } = req.query;

	// Read video data from the JSON file
	const videosFilePath = path.join(
		process.cwd(),
		"public",
		"data",
		"videos.json"
	);
	const videosData = JSON.parse(fs.readFileSync(videosFilePath, "utf8"));

	// Get videos for the specific section
	const videos = videosData[sectionId] || [];

	// Find the specific video by GUID
	const video = videos.find((v) => v.guid === guid);

	if (!video) {
		return res.status(404).json({ error: "Video not found" });
	}

	// Generate token (valid for all resolutions)
	const token = jwt.sign(
		{ exp: Math.floor(Date.now() / 1000) + 3600, v: guid },
		BUNNY_AUTH_KEY
	);

	// Define available resolutions (you might want to make this dynamic)
	const resolutions = [
		{ quality: "360p", height: 360 },
		{ quality: "720p", height: 720 },
	];

	// Create secured URLs for each resolution
	const securedUrls = resolutions.map((res) => ({
		quality: res.quality,
		height: res.height,
		url: `https://${BUNNY_CDN_URL}/${guid}/${res.quality}/video.m3u8?token=${token}`,
	}));

	res.status(200).json({
		title: video.title,
		guid: video.guid,
		securedUrls, // Now returns an array of URLs
		defaultQuality: "360p", // You can set a default
	});
}
