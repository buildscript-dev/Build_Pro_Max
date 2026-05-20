import React, { useRef, useEffect, useState } from 'react';

const VIDEO_SRC = 'https://videos.pexels.com/video-files/3129671/3129671-hd_1920_1080_30fps.mp4';

export const AmbientVideo = () => {
  const videoRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = 0.6;
    const onErr = () => setError(true);
    v.addEventListener('error', onErr);
    return () => v.removeEventListener('error', onErr);
  }, []);

  if (error) return null;

  return (
    <div className="ambient-video" aria-hidden="true">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster=""
        src={VIDEO_SRC}
      />
    </div>
  );
};
