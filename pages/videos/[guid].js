// [guid] - Copy.js
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import "plyr/dist/plyr.css";
import Hls from "hls.js";

export default function VideoPage() {
  const router = useRouter();
  const { guid } = router.query;
  const [video, setVideo] = useState(null);
  const [currentQuality, setCurrentQuality] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const hlsRef = useRef(null);

  // Fetch video details based on GUID
  useEffect(() => {
    if (guid && router.query.sectionId) {
      fetch(`/api/videos/${router.query.sectionId}/${guid}`)
        .then((res) => res.json())
        .then((data) => {
          setVideo(data);
          // Set default quality
          if (data.securedUrls?.length) {
            const defaultQuality =
              data.securedUrls.find(
                (url) => url.quality === data.defaultQuality
              ) || data.securedUrls[0];
            setCurrentQuality(defaultQuality);
          }
        })
        .catch((error) => {
          console.error("Error fetching video data:", error);
        });
    }
  }, [guid, router.query.sectionId]);

  // Load HLS stream
  const loadHlsStream = (url) => {
    setIsLoading(true);

    // Destroy previous HLS instance if exists
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 5.0,
      });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (playerRef.current) {
          playerRef.current.play();
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS.js error:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error(
                "Fatal network error encountered, trying to recover"
              );
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("Fatal media error encountered, trying to recover");
              hls.recoverMediaError();
              break;
            default:
              console.error("Fatal error encountered, cannot recover");
              hls.destroy();
              setIsLoading(false);
              break;
          }
        }
      });
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (e.g., Safari)
      videoRef.current.src = url;
      videoRef.current.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        videoRef.current.play();
      });
    } else {
      console.error("HLS is not supported in this browser.");
      alert("Your browser does not support this video format.");
      setIsLoading(false);
    }
  };

  // Initialize Plyr and load initial stream
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      video &&
      currentQuality &&
      videoRef.current
    ) {
      import("plyr")
        .then((module) => {
          const Plyr = module.default;

          // Initialize Plyr
          if (!playerRef.current) {
            playerRef.current = new Plyr(videoRef.current, {
              controls: [
                "play",
                "rewind",
                "fast-forward",
                "progress",
                "current-time",
                "mute",
                "volume",
                "settings",
                "fullscreen",
              ],
              settings: ["quality", "speed", "loop"],
              quality: {
                default: currentQuality.height,
                options: video.securedUrls.map((url) => url.height),
                forced: true,
                onChange: (quality) => {
                  const selected = video.securedUrls.find(
                    (url) => url.height === quality
                  );
                  if (selected) {
                    setCurrentQuality(selected);
                  }
                },
              },
            });
          }

          // Load initial stream
          loadHlsStream(currentQuality.url);
        })
        .catch((error) => {
          console.error("Error loading Plyr:", error);
          setIsLoading(false);
        });
    }

    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [video]); // Only run once when video data loads

  // Handle quality changes
  useEffect(() => {
    if (currentQuality && hlsRef.current) {
      loadHlsStream(currentQuality.url);
    }
  }, [currentQuality]);

  if (!video) {
    return <div>Loading video data...</div>;
  }

  return (
    <div
      style={{
        textAlign: "center",
        padding: "20px",
        color: "white",
        background: "black",
        position: "relative",
      }}
    >
      <h1 style={{ marginBottom: "10px" }}>{video.title}</h1>

      {/* Loading overlay */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <div>Switching to {currentQuality?.quality}...</div>
        </div>
      )}

      {/* Video Player */}
      <div
        style={{
          maxWidth: "800px",
          margin: "auto",
          position: "relative",
        }}
      >
        <video
          ref={videoRef}
          className="plyr"
          controls
          style={{ width: "100%" }}
        />
      </div>

      {/* Back Button */}
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={() => router.push(`/sections/${router.query.sectionId}`)}
          style={{
            background: "#ffcc00",
            color: "black",
            padding: "10px 20px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
          disabled={isLoading}
        >
          Back to Video List
        </button>
      </div>
    </div>
  );
}
