import React, { useState } from "react";
import { useEffect } from "react";
import useProgressiveImg from "./ProgressImage";

const LazyImage = ({ imgSrc, thumbSrc, style }) => {
  const [img, setImg] = useState(null);
  const [thumbImg, setThumbImg] = useState(null);
  const [src, { blur }] = useProgressiveImg(img, thumbImg);
  useEffect(() => {
    if (imgSrc) {
      setImg(imgSrc);
    }
    if (thumbSrc) {
      setThumbImg(thumbSrc);
    }
  }, [imgSrc, thumbSrc]);
  return (
    <img
      src={src}
      style={{
        ...(style || {}),
        filter: blur ? "blur(20px)" : "none",
        transition: blur ? "none" : "filter 0.2s ease-out",
      }}
    />
  );
};
export default LazyImage;
