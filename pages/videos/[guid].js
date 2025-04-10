import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";

export default function VideoPage() {
	const router = useRouter();
	const { guid } = router.query;
	const [video, setVideo] = useState(null);
	const playerContainerRef = useRef(null);

	useEffect(() => {
		if (guid && router.query.sectionId) {
			fetch(`/api/videos/${router.query.sectionId}/${guid}`)
				.then((res) => res.json())
				.then((data) => {
					console.log("Fetched video data:", data);
					setVideo(data);
				});
		}
	}, [guid, router.query.sectionId]);

	useEffect(() => {
		if (video && playerContainerRef.current) {
			const script = document.createElement("script");
			script.src =
				"https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js";
			script.async = true;
			script.onload = () => {
				if (window.MDPlayer) {
					new window.MDPlayer(playerContainerRef.current, {
						src: video.url, // assuming video.url is your HLS source
						autoplay: false,
						controls: true,
						muted: false,
						loop: false,
					});
				}
			};
			document.body.appendChild(script);
		}
	}, [video]);

	if (!video) return <div>Loading video...</div>;

	return (
		<div className="video-wrapper">
			<div
				ref={playerContainerRef}
				style={{ width: "100%", aspectRatio: "16/9" }}
			/>
		</div>
	);
}
