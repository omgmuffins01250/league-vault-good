import BlockTitle from "./BlockTitle.jsx";

import img1 from "../assets/images/app-shots/app-shot-n-1-1.png";
import img2 from "../assets/images/app-shots/app-shot-n-1-2.png";
import img3 from "../assets/images/app-shots/app-shot-n-1-3.png";
import img4 from "../assets/images/app-shots/app-shot-n-1-4.png";
import img5 from "../assets/images/app-shots/app-shot-n-1-5.png";

export default function AppScreen() {
  const shots = [img1, img2, img3, img4, img5];
  return (
    <section id="screens" className="vault-panel">
      <div className="vault-panel__inner max-w-6xl mx-auto">
        <BlockTitle title="Screenshots" text="A peek at the UI" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shots.map((src, i) => (
            <div key={i} className="vault-card rounded-2xl overflow-hidden p-2">
              <img
                src={src}
                alt={`App screen ${i + 1}`}
                className="w-full rounded-xl border border-white/5"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
