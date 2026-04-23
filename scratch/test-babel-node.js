const Babel = require('@babel/standalone');

const code = `
interface Props {
  children: ReactNode;
  val: MotionValue<number>;
}
function App({ children, val }: Props) {
  return <div />;
}
`;

try {
  const result = Babel.transform(code, { presets: ['react', 'typescript'] });
  console.log("SUCCESS:", result.code);
} catch (e) {
  console.error("ERROR:", e);
}
