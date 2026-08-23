'use client';

import { useState } from 'react';
import Image from 'next/image';
import sliderOne from '../../public/img/galeria/foto4.jpg';
import sliderTwo from '../../public/img/galeria/foto5.jpg';
import sliderThree from '../../public/img/galeria/foto9.jpg';

const slides = [
  { src: sliderOne, alt: 'Interior confortabil la PLAY ROOM ARTICHOKE' },
  { src: sliderTwo, alt: 'Spațiul de joacă pentru copii' },
  { src: sliderThree, alt: 'Atmosfera cafenelei PLAY ROOM ARTICHOKE' },
];

export default function HeroSlider() {
  const [activeSlide, setActiveSlide] = useState(0);

  const showPrevious = () => {
    setActiveSlide((current) => (current - 1 + slides.length) % slides.length);
  };

  const showNext = () => {
    setActiveSlide((current) => (current + 1) % slides.length);
  };

  return (
    <div
      className="about-slider"
      role="region"
      aria-roledescription="carusel"
      aria-label={`Fotografii din cafenea, imaginea ${activeSlide + 1} din ${slides.length}`}
    >
      {slides.map((slide, index) => (
        <Image
          key={slide.src.src}
          className={`slide ${index === activeSlide ? 'is-active' : ''}`}
          src={slide.src}
          alt={slide.alt}
          fill
          sizes="(max-width: 900px) 100vw, 54vw"
          priority={index === 0}
          aria-hidden={index !== activeSlide}
        />
      ))}

      <button
        className="slider-btn slider-btn-left"
        type="button"
        onClick={showPrevious}
        aria-label="Imaginea precedentă"
      >
        <span className="material-icons-outlined" aria-hidden="true">chevron_left</span>
      </button>
      <button
        className="slider-btn slider-btn-right"
        type="button"
        onClick={showNext}
        aria-label="Imaginea următoare"
      >
        <span className="material-icons-outlined" aria-hidden="true">chevron_right</span>
      </button>

      <div className="slider-dots" aria-label="Selectează imaginea">
        {slides.map((slide, index) => (
          <button
            key={slide.src.src}
            className={`slider-dot ${index === activeSlide ? 'is-active' : ''}`}
            type="button"
            onClick={() => setActiveSlide(index)}
            aria-label={`Afișează imaginea ${index + 1}`}
            aria-current={index === activeSlide ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  );
}
