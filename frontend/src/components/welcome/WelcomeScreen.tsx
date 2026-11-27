import { motion } from 'motion/react';
import { useEffect } from 'react';
import { getMenuItem } from '../../data/menu';
import { ORDER_TYPE_LABELS, type OrderType } from '../../lib/orders';
import { defaultOptions, type DrinkOptions } from '../../lib/pricing';
import { MAPS_URL, SHOP_ADDRESS, SHOP_HOURS } from '../../lib/shop';
import { ProductArt } from '../product-art/ProductArt';
import { OpenStatus } from '../stage/OpenStatus';
import { stageColorsFor } from '../stage/stageColors';

const LATTE = getMenuItem('latte');

type Choice = { type: OrderType; options: DrinkOptions };

const CHOICES: Choice[] = [
  { type: 'dine-in', options: { ...defaultOptions(LATTE), temperature: 'hot' } },
  { type: 'take-out', options: { ...defaultOptions(LATTE), temperature: 'iced' } },
];

type WelcomeScreenProps = {
  now: number;
  onChoose: (orderType: OrderType) => void;
};

export function WelcomeScreen({ now, onChoose }: WelcomeScreenProps) {
  useBrandColors();

  return (
    <main className="welcome">
      <div className="orbs" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <header className="welcome-top">
        <h1 className="brand">
          <span className="wordmark">Kapé Alas-Singko</span>{' '}
          <span className="brand-line" lang="bcl">
            Kapihan sa Magsaysay, Naga
          </span>
        </h1>
        <OpenStatus now={now} />
      </header>

      <section className="welcome-in" aria-labelledby="welcome-question">
        <p className="eyebrow">Welcome to our cafe!</p>
        <h2 id="welcome-question" className="welcome-title">
          How would you like to enjoy your cafe favourites today?
        </h2>

        <div className="welcome-choices">
          {CHOICES.map((choice, index) => (
            <motion.button
              key={choice.type}
              type="button"
              className="welcome-choice"
              onClick={() => onChoose(choice.type)}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.1 + index * 0.08 }}
            >
              <span className="welcome-disc" aria-hidden="true">
                <span className="welcome-cup">
                  <ProductArt item={LATTE} options={choice.options} steaming={choice.options.temperature === 'hot'} />
                </span>
              </span>
              <span className="welcome-label">{ORDER_TYPE_LABELS[choice.type]}</span>
            </motion.button>
          ))}
        </div>
      </section>

      <p className="welcome-foot soft small">
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
          {SHOP_ADDRESS}
        </a>
        . {SHOP_HOURS}.
      </p>
    </main>
  );
}

function useBrandColors() {
  useEffect(() => {
    const { background, ink } = stageColorsFor('alas-singko');
    const root = document.documentElement.style;
    root.setProperty('--bg', background);
    root.setProperty('--ink', ink);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
  }, []);
}
