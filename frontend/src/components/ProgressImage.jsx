import React from "react";

const useProgressiveImg = (lowQualitySrc, highQualitySrc) => {
  const [src, setSrc] = React.useState(lowQualitySrc);
  const [blur, setBlur] = React.useState(true);
  React.useEffect(() => {
    if (lowQualitySrc && highQualitySrc) {
      setSrc(lowQualitySrc);
      const img = new Image();
      img.src = highQualitySrc;
      img.onload = () => {
        setSrc(highQualitySrc);
        setBlur(false);
      };
    }
  }, [lowQualitySrc, highQualitySrc]);
  return [src, { blur: blur }];
};

export default useProgressiveImg;
