/**
 * ShowcaseScene - Product showcase with Ken Burns effect
 *
 * Displays product images with slow zoom/pan motion (Ken Burns effect)
 * and optional text overlay with voiceover.
 */

import React from 'react';
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Audio,
  Easing,
} from 'remotion';
import type { ShowcaseSceneProps } from '../types/UGCSceneProps';

export const ShowcaseScene: React.FC<ShowcaseSceneProps> = ({
  productImages,
  tagline,
  audioUrl,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate how long each image should be displayed
  const imagesCount = productImages.length;
  const framesPerImage = Math.floor(durationInFrames / imagesCount);

  // Determine which image to show based on current frame
  const currentImageIndex = Math.min(
    Math.floor(frame / framesPerImage),
    imagesCount - 1
  );
  const frameInCurrentImage = frame - currentImageIndex * framesPerImage;

  // Ken Burns effect parameters
  const kenBurnsProgress = interpolate(
    frameInCurrentImage,
    [0, framesPerImage],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );

  // Alternate between zoom-in and zoom-out for variety
  const isZoomIn = currentImageIndex % 2 === 0;
  const scale = isZoomIn
    ? interpolate(kenBurnsProgress, [0, 1], [1, 1.15], {
        easing: Easing.inOut(Easing.ease),
      })
    : interpolate(kenBurnsProgress, [0, 1], [1.15, 1], {
        easing: Easing.inOut(Easing.ease),
      });

  // Subtle pan effect
  const panX = interpolate(kenBurnsProgress, [0, 1], [0, isZoomIn ? 3 : -3], {
    easing: Easing.inOut(Easing.ease),
  });
  const panY = interpolate(kenBurnsProgress, [0, 1], [0, isZoomIn ? 2 : -2], {
    easing: Easing.inOut(Easing.ease),
  });

  // Cross-fade transition between images
  const transitionDuration = Math.min(15, framesPerImage / 4); // 0.5s or 1/4 of image duration
  const imageOpacity = interpolate(
    frameInCurrentImage,
    [0, transitionDuration, framesPerImage - transitionDuration, framesPerImage],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Tagline animation - fade in at start, persist
  const taglineOpacity = interpolate(
    frame,
    [fps * 0.5, fps * 1.5],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const taglineTranslateY = interpolate(
    frame,
    [fps * 0.5, fps * 1.5],
    [20, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease),
    }
  );

  return (
    <AbsoluteFill className="bg-black">
      {/* Audio if provided */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Product images with Ken Burns effect */}
      {productImages.map((imageUrl, index) => {
        const isCurrentImage = index === currentImageIndex;
        const isPreviousImage = index === currentImageIndex - 1;

        // Only render current and previous image for performance
        if (!isCurrentImage && !isPreviousImage) return null;

        // Previous image fades out as current fades in
        const opacity = isCurrentImage
          ? imageOpacity
          : interpolate(
              frameInCurrentImage,
              [0, transitionDuration],
              [1, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );

        return (
          <AbsoluteFill
            key={index}
            style={{
              opacity,
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <Img
              src={imageUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: isCurrentImage
                  ? `scale(${scale}) translate(${panX}%, ${panY}%)`
                  : 'scale(1)',
              }}
            />
          </AbsoluteFill>
        );
      })}

      {/* Gradient overlay for text readability */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      {/* Tagline overlay */}
      {tagline && (
        <AbsoluteFill
          style={{
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 180,
          }}
        >
          <div
            style={{
              opacity: taglineOpacity,
              transform: `translateY(${taglineTranslateY}px)`,
              textAlign: 'center',
              padding: '0 40px',
            }}
          >
            <p
              style={{
                color: 'white',
                fontSize: 48,
                fontWeight: 600,
                textShadow: '0 2px 20px rgba(0,0,0,0.8)',
                lineHeight: 1.3,
                margin: 0,
              }}
            >
              {tagline}
            </p>
          </div>
        </AbsoluteFill>
      )}

      {/* Image indicator dots */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 80,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          {productImages.map((_, index) => (
            <div
              key={index}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor:
                  index === currentImageIndex
                    ? 'white'
                    : 'rgba(255,255,255,0.4)',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default ShowcaseScene;
