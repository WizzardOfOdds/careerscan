// A hand-written sample run, so the tool can be explored without an API key.
// The candidate is fictional. The companies are real, and the fit notes are
// illustrative, not the output of a live search.

export const DEMO_TRANSCRIPT = [
  { role: "assistant", content: "Thanks, Lena. From your CV: M.Sc. Mechanical Engineering, graduating next spring, a six-month internship in production planning at a car plant, and a thesis on line balancing. Your form says you're drawn to automotive and energy, and a hard no on jobs with constant travel.\n\nFirst: in the internship, which piece of work would you happily do again tomorrow, and what exactly did you own in it? (one concrete example)" },
  { role: "user", content: "Re-planning the station layout when a new variant came in. I built the simulation, found the bottleneck at the screwing station and proposed splitting it. They implemented it." },
  { role: "assistant", content: "So you took a messy change, modelled it, and got a decision made. Two options, both good: would you rather own the model that says what should change, or own the change on the shop floor until it runs? (pick one, and say why in a sentence)" },
  { role: "user", content: "The shop floor. The simulation was fun but seeing it run was the best part." },
  { role: "assistant", content: "Noted: you want to be close to the physical process, not only the analysis. Last one: big stable company, or a smaller place where you'd carry more at once? And is there a region you want to stay in? (a sentence is plenty)" },
  { role: "user", content: "Big is fine if I get real responsibility early. Southern Germany ideally, but I could move for the right thing." },
  { role: "assistant", content: "That's enough to build a good scan. You're an engineer who turns production problems into working changes on the floor, and you want early ownership near the process.\n[[PROFILE_COMPLETE]]" },
];

export const DEMO_SCAN = {
  summary: "Mechanical engineering master's student with hands-on production-planning experience: modelled a line change, found the bottleneck and saw the fix implemented. Wants to own changes on the shop floor, early responsibility, southern Germany preferred.",
  pitch: "I turn production changes into lines that run, from the simulation to the shop floor.",
  buckets: [
    {
      key: "obvious",
      companies: [
        { name: "BMW Group", url: "https://www.bmwgroup.com", location: "Munich, Dingolfing, Regensburg", what: "Car maker with large German assembly plants.", why_fit: "Production planning and ramp-up roles are exactly the internship work, at scale.", bridge: "" },
        { name: "Bosch", url: "https://www.bosch.com", location: "Stuttgart region and plants across Germany", what: "Automotive supplier and industrial technology group.", why_fit: "Plant-level industrial engineering roles with real line ownership.", bridge: "" },
        { name: "ZF Group", url: "https://www.zf.com", location: "Friedrichshafen and plants in southern Germany", what: "Drivetrain and chassis supplier.", why_fit: "Many variants on shared lines, the same balancing problem as the thesis.", bridge: "" },
      ],
    },
    {
      key: "adjacent",
      companies: [
        { name: "Siemens Energy", url: "https://www.siemens-energy.com", location: "Berlin, Erlangen, Mülheim", what: "Turbines, grid technology and electrolysers.", why_fit: "Matches the interest in energy. Growing manufacturing footprint that needs production engineers.", bridge: "" },
        { name: "TRUMPF", url: "https://www.trumpf.com", location: "Ditzingen", what: "Machine tools and industrial lasers.", why_fit: "Builds the machines that go on lines like the ones you planned. Roles sit between customer and shop floor.", bridge: "" },
        { name: "Festo", url: "https://www.festo.com", location: "Esslingen", what: "Factory and process automation.", why_fit: "Application engineering puts your line-design experience on the vendor side.", bridge: "" },
      ],
    },
    {
      key: "unexpected",
      companies: [
        { name: "Boehringer Ingelheim", url: "https://www.boehringer-ingelheim.com", location: "Ingelheim, Biberach", what: "Pharmaceutical company that builds and runs its own production sites.", why_fit: "Pharma plants need people who can plan and start up filling and packaging lines.", bridge: "Line balancing and ramp-up experience → starting up a new fill-finish line." },
        { name: "Infineon Technologies", url: "https://www.infineon.com", location: "Munich, Regensburg, Dresden", what: "Semiconductor manufacturer.", why_fit: "Fab and back-end assembly engineering is throughput and bottleneck work.", bridge: "Finding the bottleneck station → raising throughput in chip back-end assembly." },
        { name: "DHL Group", url: "https://group.dhl.com", location: "Leipzig hub and sites across Germany", what: "Logistics group running highly automated sorting hubs.", why_fit: "Hub design and automation projects are line layout problems with parcels instead of cars.", bridge: "Station layout and simulation → designing sorter and conveyor layouts." },
      ],
    },
  ],
  tradeoffs: "Car makers offer the clearest path but more competition for early responsibility. The unexpected options are less crowded and often give ownership sooner, but switching industries means learning new regulation, e.g. GMP in pharma. Openings change constantly, so check each company's careers page.",
};
