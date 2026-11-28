import { motion } from 'motion/react';
import { useEffect } from 'react';
import { useShop } from '../../api/hooks';
import { useOptionalCatalog } from '../../data/CatalogContext';
import { ORDER_TYPE_LABELS, type OrderType } from '../../lib/orders';
import { defaultOptions } from '../../lib/pricing';
import { describeHours, mapsUrl } from '../../lib/shop';
import { ProductArt } from '../product-art/ProductArt';
import { OpenStatus } from '../stage/OpenStatus';

// The brand colours, used until (and unless) the menu says otherwise.
const BRAND_COLORS = { background: '#ff99d3', ink: '#3d0012' };

const CHOICES: { type: OrderType; temperature: 'hot' | 'iced' }[] = [
  { type: 'dine-in', temperature: 'hot' },
  { type: 'take-out', temperature: 'iced' },
];

type WelcomeScreenProps = {
  /** Current time in milliseconds. */
  now: number;
  onChoose: (orderType: OrderType) => void;
};

export function WelcomeScreen({ now, onChoose }: WelcomeScreenProps) {
  // The welcome screen shows straight away. The menu and shop details fill in when the API answers.
  const catalog = useOptionalCatalog();
  const { data: shop } = useShop();
  const latte = catalog?.findItem('latte');
  const brand = catalog?.findItem('alas-singko');
  useBrandColors(brand?.stageBackground ?? BRAND_COLORS.background, brand?.stageInk ?? BRAND_COLORS.ink);

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
                  {latte && (
                    <ProductArt item={latte} options={{ ...defaultOptions(latte), temperature: choice.temperature }} steaming={choice.temperature === 'hot'} />
                  )}
                </span>
              </span>
              <span className="welcome-label">{ORDER_TYPE_LABELS[choice.type]}</span>
            </motion.button>
          ))}
        </div>
      </section>

      <p className="welcome-foot soft small">
        {shop ? (
          <>
            <a href={mapsUrl(shop)} target="_blank" rel="noopener noreferrer">
              {shop.address}
            </a>
            . {describeHours(shop.openingHours)}.
          </>
        ) : (
          'Finding our hours…'
        )}
      </p>
    </main>
  );
}

function useBrandColors(background: string, ink: string) {
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--bg', background);
    root.setProperty('--ink', ink);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
  }, [background, ink]);
}
