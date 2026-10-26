import './config/env.js';
import mongoose from 'mongoose';
import Job from './models/Job.js';

const SEED_JOBS = [
  {
    title: 'Senior Frontend Engineer',
    company: 'Linear Labs',
    location: 'San Francisco, CA',
    employmentType: 'Full-time',
    workplaceType: 'Remote',
    description: 'We are seeking an exceptional Senior Frontend Engineer to lead the architecture of our real-time issue tracking interface. You will build highly responsive UI components using React 19, TypeScript, and modern CSS architecture with micro-second responsiveness.',
    skills: ['React', 'TypeScript', 'TailwindCSS', 'Next.js', 'WebSockets'],
    salaryMin: 140000,
    salaryMax: 175000,
  },
  {
    title: 'Full Stack Developer',
    company: 'Vercel Ecosystem',
    location: 'San Francisco, CA',
    employmentType: 'Full-time',
    workplaceType: 'Hybrid',
    description: 'Join the ecosystem team building developer platforms, serverless edge integrations, and real-time developer workflows. You will work across Node.js backend services, React frontends, and distributed database layers.',
    skills: ['Node.js', 'Express', 'React', 'MongoDB', 'TypeScript'],
    salaryMin: 130000,
    salaryMax: 160000,
  },
  {
    title: 'Lead Backend Engineer (Distributed Systems)',
    company: 'Supabase Partner',
    location: 'Austin, TX',
    employmentType: 'Full-time',
    workplaceType: 'Remote',
    description: 'Architect resilient distributed backend APIs, queue processors, and real-time replication pipelines. Requires deep familiarity with Node.js, asynchronous I/O, database indexing, and container orchestration.',
    skills: ['Node.js', 'Express', 'MongoDB', 'Redis', 'Docker'],
    salaryMin: 155000,
    salaryMax: 190000,
  },
  {
    title: 'Product Designer (Design Systems)',
    company: 'Stripe Studios',
    location: 'New York, NY',
    employmentType: 'Full-time',
    workplaceType: 'Remote',
    description: 'Shape the next generation of financial user interfaces and design systems. You will bridge design and code, collaborating closely with frontend engineers to produce accessible, pixel-perfect component libraries.',
    skills: ['Figma', 'Design Systems', 'UI/UX', 'TailwindCSS', 'Accessibility'],
    salaryMin: 125000,
    salaryMax: 155000,
  },
  {
    title: 'Technical Product Manager',
    company: 'Retool Collective',
    location: 'New York, NY',
    employmentType: 'Contract',
    workplaceType: 'On-site',
    description: 'Drive API developer experience and product roadmap for enterprise internal tooling. Lead cross-functional sprints across engineering, product design, and customer success teams.',
    skills: ['API Design', 'Roadmap', 'Agile', 'SQL', 'Product Strategy'],
    salaryMin: 110000,
    salaryMax: 140000,
  },
  {
    title: 'Junior Cloud Infrastructure Engineer',
    company: 'Cloudflare Ventures',
    location: 'Seattle, WA',
    employmentType: 'Internship',
    workplaceType: 'Hybrid',
    description: 'Work alongside staff reliability engineers to monitor, scale, and automate cloud infrastructure pipelines. Great opportunity for early-career engineers passionate about networks and edge compute.',
    skills: ['Linux', 'Docker', 'Bash', 'Networking', 'Node.js'],
    salaryMin: 70000,
    salaryMax: 90000,
  },
  {
    title: 'Staff Security Engineer',
    company: 'Datadog Partner',
    location: 'Boston, MA',
    employmentType: 'Full-time',
    workplaceType: 'On-site',
    description: 'Lead application security reviews, threat modeling, and automated vulnerability scanning across microservices. Partner with engineering leads to ensure SOC2 and zero-trust security postures.',
    skills: ['Security', 'OAuth', 'JWT', 'Threat Modeling', 'Node.js'],
    salaryMin: 165000,
    salaryMax: 205000,
  },
  {
    title: 'Part-Time Technical Content Writer',
    company: 'Prisma Devs',
    location: 'Remote (Global)',
    employmentType: 'Part-time',
    workplaceType: 'Remote',
    description: 'Author technical documentation, developer tutorials, and sample repositories demonstrating full-stack MERN integrations and database best practices.',
    skills: ['Technical Writing', 'Markdown', 'React', 'MongoDB', 'Node.js'],
    salaryMin: 45000,
    salaryMax: 65000,
  },
];

async function seed() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('❌ MONGO_URI is not defined in .env');
      process.exit(1);
    }

    console.log('🌱 Connecting to MongoDB Atlas for seeding...');
    await mongoose.connect(uri);

    const count = await Job.countDocuments();
    if (count > 0) {
      console.log(`ℹ️ Database already has ${count} job(s). Cleaning old seed data...`);
      await Job.deleteMany({});
    }

    console.log(`📝 Inserting ${SEED_JOBS.length} realistic job postings...`);
    const inserted = await Job.insertMany(SEED_JOBS);
    console.log(`✅ Successfully seeded ${inserted.length} jobs into MongoDB Atlas!`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
