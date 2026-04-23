import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, useInView, useAnimation, useScroll, useMotionValue, useSpring, useTransform, MotionValue } from 'framer-motion';

// --- Color System Constants ---
const PRIMARY_BACKGROUND = '#0A0A0C';
const ACCENT_BLUE = '#6366F1';
const SECONDARY_ACCENT = '#93C5FD';
const CARD_BG = 'rgba(255,255,255,0.05)';
const CARD_BORDER = 'rgba(255,255,255,0.1)';
const HOVER_CARD_BG = '#1A1A1D';

// --- Easing Definitions ---
const smoothSpring = { stiffness: 80, damping: 40 };
const minimalSpring = { stiffness: 200, damping: 25 };
const bouncySpring = { stiffness: 400, damping: 10 };
const elasticSpring = { stiffness: 300, damping: 5 };

// --- Reusable Motion Components ---

interface AnimatedButtonProps {
  children: ReactNode;
  primary?: boolean;
  className?: string;
  onClick?: () => void;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({ children, primary = true, className = '', onClick }) => {
  return (
    <motion.button
      whileHover={{
        scale: 1.05,
        boxShadow: `0 0 25px ${ACCENT_BLUE}66, 0 0 10px ${ACCENT_BLUE}33 inset`, // 66 is 40% opacity, 33 is 20% opacity
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', ...bouncySpring, duration: 0.15 }}
      className={`px-6 py-3 rounded-lg font-semibold text-lg whitespace-nowrap ${
        primary
          ? `bg-[${ACCENT_BLUE}] text-white`
          : `bg-transparent text-white border border-[${ACCENT_BLUE}]`
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
};

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, className = '', delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px 0px' });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring', ...smoothSpring, duration: 1.0, delay: delay },
      });
    }
  }, [isInView, controls, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={controls}
      whileHover={{
        scale: 1.03,
        backgroundColor: HOVER_CARD_BG,
        borderColor: ACCENT_BLUE,
        boxShadow: `0 0 20px ${ACCENT_BLUE}33`, // 33 is 20% opacity
      }}
      transition={{ type: 'spring', ...minimalSpring, duration: 0.2 }}
      className={`p-6 rounded-xl border border-[${CARD_BORDER}] bg-[${CARD_BG}] shadow-lg ${className}`}
      style={{ backdropFilter: 'blur(10px)' }}
    >
      {children}
    </motion.div>
  );
};

interface SectionTitleProps {
  title: string;
  description: string;
  delay?: number;
}

const SectionTitle: React.FC<SectionTitleProps> = ({ title, description, delay = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px 0px' });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start({
        opacity: 1,
        y: 0,
        transition: { type: 'spring', ...smoothSpring, duration: 1.0, delay: delay },
      });
    }
  }, [isInView, controls, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={controls}
      className="text-center mb-12"
    >
      <h2 className="text-5xl font-bold text-white mb-4">{title}</h2>
      <p className="text-xl text-gray-400 max-w-2xl mx-auto">{description}</p>
    </motion.div>
  );
};

// --- Navbar Component ---
const Navbar: React.FC = () => {
  const { scrollY } = useScroll();
  const background = useTransform(
    scrollY,
    [0, 50],
    ['transparent', `rgba(10,10,12,0.8)`]
  );
  const backdropFilter = useTransform(
    scrollY,
    [0, 50],
    ['blur(0px)', 'blur(10px)']
  );

  const controls = useAnimation();

  useEffect(() => {
    controls.start({
      y: 0,
      opacity: 1,
      transition: { type: 'spring', ...smoothSpring, delay: 0.5, duration: 0.8 },
    });
  }, [controls]);

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={controls}
      style={{ background, backdropFilter }}
      className="fixed top-0 left-0 right-0 z-50 py-4"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center">
          <motion.a
            href="#"
            className="text-2xl font-bold text-white"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', ...minimalSpring }}
          >
            <span className={`text-[${ACCENT_BLUE}]`}>Tech</span>Flow
          </motion.a>
        </div>
        <div className="hidden md:flex items-center space-x-8">
          {['Home', 'Features', 'Pricing', 'Testimonials', 'Contact'].map((item) => (
            <motion.a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-gray-300 hover:text-white text-lg font-medium"
              whileHover={{ color: '#FFFFFF', scale: 1.05 }}
              transition={{ type: 'spring', ...minimalSpring }}
            >
              {item}
            </motion.a>
          ))}
          <AnimatedButton primary={true} onClick={() => {}}>
            Get Started
          </AnimatedButton>
          {/* Dark/Light Mode Toggle - Placeholder */}
          <motion.button
            className="text-gray-300 hover:text-white"
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', ...minimalSpring }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h1M3 12H2m15.325-4.275l.707-.707M6.707 17.293l-.707.707M18.707 6.707l.707-.707M6.707 6.707L6 6m12 12l-.707-.707M4 12a8 8 0 1116 0A8 8 0 014 12z"
              />
            </svg>
          </motion.button>
        </div>
        <div className="md:hidden">
          {/* Mobile menu button - Placeholder */}
          <button className="text-gray-300 hover:text-white focus:outline-none">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>
        </div>
      </div>
    </motion.nav>
  );
};

// --- Hero Section Component ---
interface ParticleProps {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  index: number;
}

const Particle: React.FC<ParticleProps> = ({ mouseX, mouseY, index }) => {
  const randomX = useRef(Math.random() * 200 - 100); // -100 to 100
  const randomY = useRef(Math.random() * 200 - 100); // -100 to 100
  const randomScale = useRef(0.5 + Math.random() * 0.5); // 0.5 to 1.0
  const randomOpacity = useRef(0.2 + Math.random() * 0.2); // 0.2 to 0.4
  const randomDelay = useRef(Math.random() * 0.5); // 0 to 0.5

  const x = useTransform(mouseX, [0, 1], [randomX.current, randomX.current + 40]);
  const y = useTransform(mouseY, [0, 1], [randomY.current, randomY.current + 40]);
  const scale = useTransform(mouseX, [0, 1], [randomScale.current, randomScale.current * 1.2]);
  const opacity = useTransform(mouseY, [0, 1], [randomOpacity.current, randomOpacity.current * 1.5]);

  return (
    <motion.div
      className={`absolute rounded-full bg-[${SECONDARY_ACCENT}]`}
      style={{
        width: 10 + index * 2, // Vary size
        height: 10 + index * 2,
        x,
        y,
        scale,
        opacity,
        filter: 'blur(5px)', // Background depth blur
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: randomOpacity.current }}
      transition={{ delay: randomDelay.current, duration: 2, repeat: Infinity, repeatType: "reverse" }}
    />
  );
};

const HeroSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px 0px' });
  const controls = useAnimation();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, elasticSpring);
  const springY = useSpring(mouseY, elasticSpring);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (ref.current) {
      const { clientX, clientY } = e;
      const { left, top, width, height } = ref.current.getBoundingClientRect();
      const x = (clientX - left) / width; // Normalized 0-1
      const y = (clientY - top) / height; // Normalized 0-1
      mouseX.set(x);
      mouseY.set(y);
    }
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5); // Reset to center
    mouseY.set(0.5);
  };

  useEffect(() => {
    if (isInView) {
      controls.start((i) => ({
        y: 0,
        opacity: 1,
        scale: 1,
        transition: {
          type: 'spring',
          ...smoothSpring,
          duration: i === 0 ? 0.8 : 1.2, // Text vs background duration
          delay: i * 0.2 + (i === 0 ? 0 : 0.5), // Staggered delay for elements
        },
      }));
    }
  }, [isInView, controls]);

  useEffect(() => {
    // Initialize mouse position to center for particles
    mouseX.set(0.5);
    mouseY.set(0.5);
  }, [mouseX, mouseY]);

  return (
    <section id="home" ref={ref} className={`relative min-h-screen flex items-center justify-center overflow-hidden bg-[${PRIMARY_BACKGROUND}]`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Interactive Background */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={controls}
        custom={1} // Custom value for background animation
      >
        {Array.from({ length: 30 }).map((_, i) => (
          <Particle key={i} mouseX={springX} mouseY={springY} index={i} />
        ))}
        {/* Radial gradient glow for focal point */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, ${SECONDARY_ACCENT}1A 0%, transparent 50%)`, // 1A is 10% opacity
            filter: 'blur(50px)',
            opacity: 0.3,
          }}
        />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h1
          className="text-7xl font-extrabold text-white mb-6 leading-tight"
          initial={{ y: 50, opacity: 0, scale: 0.98 }}
          animate={controls}
          custom={0} // Custom value for headline animation
          style={{
            background: `linear-gradient(90deg, ${ACCENT_BLUE} 0%, ${SECONDARY_ACCENT} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Unleash the Future of <br />
          <span className="relative inline-block">
            Technology
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 1.2, duration: 0.8, ease: 'easeOut' }}
              className={`absolute bottom-0 left-0 h-1 bg-[${ACCENT_BLUE}]`}
            />
          </span>
        </motion.h1>
        <motion.p
          className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto"
          initial={{ y: 50, opacity: 0 }}
          animate={controls}
          custom={0.5} // Custom value for subtext animation
        >
          Revolutionizing digital experiences with cutting-edge solutions and seamless integration.
          Discover innovation at its core.
        </motion.p>
        <div className="flex justify-center space-x-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={controls} custom={1}>
            <AnimatedButton primary={true}>
              Explore Features
            </AnimatedButton>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={controls} custom={1.2}>
            <AnimatedButton primary={false}>
              Contact Sales
            </AnimatedButton>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// --- Features Section Component ---
interface FeatureCardProps {
  icon: string; // Placeholder for icon, could be a React component or path
  title: string;
  description: string;
  delay: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay }) => {
  return (
    <AnimatedCard delay={delay} className="flex flex-col items-center text-center">
      <div className={`text-5xl text-[${ACCENT_BLUE}] mb-4`}>{icon}</div>
      <h3 className="text-2xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </AnimatedCard>
  );
};

const FeaturesSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px 0px' });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start((i) => ({
        opacity: 1,
        y: 0,
        transition: { type: 'spring', ...smoothSpring, duration: 1.0, delay: i * 0.15 },
      }));
    }
  }, [isInView, controls]);

  const features = [
    { icon: '⚡', title: 'Blazing Fast', description: 'Experience unparalleled speed and responsiveness.' },
    { icon: '🔒', title: 'Secure & Private', description: 'Your data is protected with industry-leading encryption.' },
    { icon: '💡', title: 'Intuitive Design', description: 'Effortless navigation and a user-friendly interface.' },
    { icon: '⚙️', title: 'Highly Customizable', description: 'Tailor every aspect to fit your unique needs.' },
    { icon: '🌐', title: 'Global Reach', description: 'Connect with users and services worldwide.' },
    { icon: '📈', title: 'Scalable Solutions', description: 'Grow your operations without limits.' },
  ];

  return (
    <section id="features" className={`py-20 bg-[${PRIMARY_BACKGROUND}]`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" ref={ref}>
        <SectionTitle
          title="Powerful Features for Your Business"
          description="Discover how our platform can transform your operations and drive success."
          delay={0}
        />
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial="hidden"
          animate={controls}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          {features.map((feature, i) => (
            <motion.div key={i} custom={i}>
              <FeatureCard {...feature} delay={i * 0.1} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// --- Pricing Section Component ---
interface PricingCardProps {
  plan: string;
  price: string;
  features: string[];
  highlight?: boolean;
  delay: number;
}

const PricingCard: React.FC<PricingCardProps> = ({ plan, price, features, highlight = false, delay }) => {
  return (
    <AnimatedCard
      delay={delay}
      className={`flex flex-col items-center text-center ${highlight ? `border-[${ACCENT_BLUE}] shadow-xl` : ''}`}
    >
      <h3 className="text-3xl font-bold text-white mb-4">{plan}</h3>
      <p className={`text-5xl font-extrabold text-[${ACCENT_BLUE}] mb-6`}>{price}</p>
      <ul className="text-gray-300 text-lg mb-8 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center justify-center">
            <svg className={`w-6 h-6 text-[${SECONDARY_ACCENT}] mr-2`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path>
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <AnimatedButton primary={highlight} className="mt-auto">
        Choose Plan
      </AnimatedButton>
    </AnimatedCard>
  );
};

const PricingSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px 0px' });
  const controls = useAnimation();
  const [isMonthly, setIsMonthly] = useState(true);

  useEffect(() => {
    if (isInView) {
      controls.start((i) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring', ...smoothSpring, duration: 1.0, delay: i * 0.15 },
      }));
    }
  }, [isInView, controls]);

  const pricingPlans = [
    {
      plan: 'Basic',
      monthlyPrice: '$29/mo',
      yearlyPrice: '$299/yr',
      features: ['5 Users', '10GB Storage', 'Basic Analytics', 'Email Support'],
      highlight: false,
    },
    {
      plan: 'Pro',
      monthlyPrice: '$59/mo',
      yearlyPrice: '$599/yr',
      features: ['20 Users', '100GB Storage', 'Advanced Analytics', 'Priority Support', 'Custom Integrations'],
      highlight: true,
    },
    {
      plan: 'Enterprise',
      monthlyPrice: '$129/mo',
      yearlyPrice: '$1299/yr',
      features: ['Unlimited Users', 'Unlimited Storage', 'AI Analytics', '24/7 Dedicated Support', 'API Access'],
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className={`py-20 bg-[${PRIMARY_BACKGROUND}]`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" ref={ref}>
        <SectionTitle
          title="Flexible Pricing for Every Need"
          description="Choose the perfect plan that scales with your business."
          delay={0}
        />

        <motion.div
          className="flex justify-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', ...smoothSpring, delay: 0.2 }}
        >
          <div className={`relative flex p-1 bg-[${CARD_BG}] rounded-full border border-[${CARD_BORDER}]`}>
            <button
              className={`px-6 py-2 rounded-full text-lg font-medium transition-colors duration-300 ${
                isMonthly ? `bg-[${ACCENT_BLUE}] text-white` : 'text-gray-400'
              }`}
              onClick={() => setIsMonthly(true)}
            >
              Monthly
            </button>
            <button
              className={`px-6 py-2 rounded-full text-lg font-medium transition-colors duration-300 ${
                !isMonthly ? `bg-[${ACCENT_BLUE}] text-white` : 'text-gray-400'
              }`}
              onClick={() => setIsMonthly(false)}
            >
              Yearly
            </button>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          initial="hidden"
          animate={controls}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          {pricingPlans.map((plan, i) => (
            <motion.div key={i} custom={i}>
              <PricingCard
                {...plan}
                price={isMonthly ? plan.monthlyPrice : plan.yearlyPrice}
                delay={i * 0.1}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// --- Testimonials Section Component ---
interface TestimonialCardProps {
  quote: string;
  author: string;
  company: string;
  avatar: string; // URL or path to image
  delay: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ quote, author, company, avatar, delay }) => {
  return (
    <AnimatedCard delay={delay} className="flex flex-col items-center text-center p-8">
      <img src={avatar} alt={author} className={`w-20 h-20 rounded-full mb-4 object-cover border-2 border-[${ACCENT_BLUE}]`} />
      <p className="text-gray-300 text-lg italic mb-4">"{quote}"</p>
      <p className="text-white font-semibold text-xl">{author}</p>
      <p className="text-gray-400 text-md">{company}</p>
    </AnimatedCard>
  );
};

const TestimonialsSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px 0px' });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start((i) => ({
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', ...smoothSpring, duration: 1.0, delay: i * 0.15 },
      }));
    }
  }, [isInView, controls]);

  const testimonials = [
    {
      quote: 'This platform has transformed our workflow. The intuitive design and powerful features are unmatched.',
      author: 'Jane Doe',
      company: 'Tech Solutions Inc.',
      avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    },
    {
      quote: 'A truly revolutionary product! Our team\'s productivity has skyrocketed since we started using it.',
      author: 'John Smith',
      company: 'Innovate Corp.',
      avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    },
    {
      quote: 'The best investment we\'ve made this year. The support team is also incredibly responsive and helpful.',
      author: 'Emily White',
      company: 'Global Ventures',
      avatar: 'https://randomuser.me/api/portraits/women/3.jpg',
    },
  ];

  return (
    <section id="testimonials" className={`py-20 bg-[${PRIMARY_BACKGROUND}]`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" ref={ref}>
        <SectionTitle
          title="What Our Clients Say"
          description="Hear from businesses that have achieved remarkable success with our platform."
          delay={0}
        />
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          initial="hidden"
          animate={controls}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          {testimonials.map((testimonial, i) => (
            <motion.div key={i} custom={i}>
              <TestimonialCard {...testimonial} delay={i * 0.1} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// --- CTA Section Component ---
const CTASection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px 0px' });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start((i) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring', ...smoothSpring, duration: 1.0, delay: i * 0.2 },
      }));
    }
  }, [isInView, controls]);

  return (
    <section id="contact" className={`py-20 bg-[${PRIMARY_BACKGROUND}]`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center" ref={ref}>
        <motion.h2
          className="text-6xl font-extrabold text-white mb-6 leading-tight"
          initial={{ y: 50, opacity: 0 }}
          animate={controls}
          custom={0}
          style={{
            background: `linear-gradient(90deg, ${ACCENT_BLUE} 0%, ${SECONDARY_ACCENT} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Ready to Elevate Your Business?
        </motion.h2>
        <motion.p
          className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto"
          initial={{ y: 50, opacity: 0 }}
          animate={controls}
          custom={0.5}
        >
          Join thousands of innovators who trust us to power their success.
          Get started today and experience the difference.
        </motion.p>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={controls} custom={1}>
          <AnimatedButton primary={true} className="px-10 py-4 text-xl">
            Start Your Free Trial
          </AnimatedButton>
        </motion.div>
      </div>
    </section>
  );
};

// --- Footer Component ---
const Footer: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px 0px' });
  const controls = useAnimation();

  useEffect(() => {
    if (isInView) {
      controls.start({
        opacity: 1,
        transition: { duration: 1.0, delay: 0.2 },
      });
    }
  }, [isInView, controls]);

  return (
    <motion.footer
      id="footer"
      className={`bg-[${PRIMARY_BACKGROUND}] py-12 text-gray-400 text-center`}
      ref={ref}
      initial={{ opacity: 0 }}
      animate={controls}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="mb-4 md:mb-0">
            <a href="#" className="text-2xl font-bold text-white">
              <span className={`text-[${ACCENT_BLUE}]`}>Tech</span>Flow
            </a>
          </div>
          <div className="flex space-x-6 mb-4 md:mb-0">
            {['Privacy Policy', 'Terms of Service', 'Sitemap'].map((link) => (
              <a key={link} href="#" className="hover:text-white transition-colors duration-200">
                {link}
              </a>
            ))}
          </div>
          <div className="flex space-x-4">
            {['facebook', 'twitter', 'linkedin', 'instagram'].map((social) => (
              <motion.a
                key={social}
                href="#"
                className="text-gray-400 hover:text-white"
                whileHover={{ scale: 1.2 }}
                transition={{ type: 'spring', ...minimalSpring }}
              >
                {/* Placeholder for social icons */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.5 8h-2v2h2v2h-2v4h-3v-4H8v-2h2V8.5c0-1.229.614-2.5 2.5-2.5h2v3z" />
                </svg>
              </motion.a>
            ))}
          </div>
        </div>
        <p className="text-sm">
          &copy; {new Date().getFullYear()} TechFlow. All rights reserved.
        </p>
      </div>
    </motion.footer>
  );
};

// --- Main Landing Page Component ---
export default function FuturisticAnimatedTechLandingPage() {
  return (
    <motion.div
      className="font-sans antialiased"
      style={{ minHeight: '100%', width: '100%', backgroundColor: PRIMARY_BACKGROUND }}
    >
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </motion.div>
  );
}