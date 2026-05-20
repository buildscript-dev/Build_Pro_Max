import React, { Suspense, lazy, useState } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

const FALLBACK_SCENE = 'https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode';

export const SplineScene = ({ url = FALLBACK_SCENE, style = {} }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background:
            'radial-gradient(circle at 30% 30%, rgba(245,165,36,0.25), rgba(231,64,46,0.15))',
          borderRadius: 'inherit',
          ...style,
        }}
      />
    );
  }

  return (
    <div className="spline-scene" style={style}>
      <Suspense
        fallback={
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink-3)',
              fontSize: 12,
            }}
          >
            Loading 3D…
          </div>
        }
      >
        <Spline
          scene={url}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%' }}
        />
      </Suspense>
    </div>
  );
};
