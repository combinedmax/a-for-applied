import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function SectionPage() {
	const router = useRouter();
	const { sectionId } = router.query; // Get the dynamic section ID from the URL
	const [videos, setVideos] = useState([]);
	const [sectionName, setSectionName] = useState(""); // State to store the section name

	// Fetch section name and video data
	useEffect(() => {
		if (sectionId) {
			// Fetch section name from sections.json
			fetch("/data/sections.json")
				.then((res) => {
					if (!res.ok) {
						throw new Error("Failed to fetch sections");
					}
					return res.json();
				})
				.then((data) => {
					const section = data.find((s) => s.id === sectionId);
					if (section) {
						setSectionName(section.name); // Set the section name
					}
				})
				.catch((error) => {
					console.error("Error fetching sections:", error);
				});

			// Fetch video data for the specific section
			fetch("/data/videos.json")
				.then((res) => {
					if (!res.ok) {
						throw new Error("Failed to fetch videos");
					}
					return res.json();
				})
				.then((data) => {
					setVideos(data[sectionId] || []);
				})
				.catch((error) => {
					console.error("Error fetching videos:", error);
				});
		}
	}, [sectionId]);

	return (
		<div
			style={{
				textAlign: "center",
				padding: "20px",
				color: "white",
				background: "black",
			}}
		>
			{/* Display the section name */}
			<h1 style={{ marginBottom: "20px" }}>{sectionName} Videos</h1>

			{/* List of Videos as Buttons */}
			<div>
				{videos.map((video, index) => (
					<a
						key={video.guid}
						href={`/videos/${video.guid}?sectionId=${sectionId}`}
						target="_blank"
						rel="noopener noreferrer"
						style={{
							display: "inline-block",
							background: "#ffcc00",
							color: "black",
							padding: "10px 20px",
							margin: "10px",
							border: "none",
							borderRadius: "5px",
							cursor: "pointer",
							fontWeight: "bold",
							textDecoration: "none",
						}}
					>
						{video.title}
					</a>
				))}
			</div>
		</div>
	);
}
