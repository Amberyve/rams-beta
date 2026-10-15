// Declarative definitions of every RAMS record type.
// The generic <ResourceManager> reads these to build the table, search,
// filters and the add/edit form — add a field here and it appears everywhere.

export type Role = 'admin' | 'rsd' | 'user';

export type FieldType =
  | 'text' | 'textarea' | 'email' | 'date' | 'year' | 'currency'
  | 'select' | 'tags' | 'image' | 'relation' | 'lookup';

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  relation?: { table: string; labelKey: string };
  wide?: boolean; // spans both form columns
}

export type CellKind = 'text' | 'strong' | 'date' | 'currency' | 'status' | 'tags' | 'avatar' | 'relation' | 'muted';

export interface Column {
  key: string;
  label: string;
  kind?: CellKind;
  relationKey?: string; // for kind 'relation': key inside joined object
  hideOnMobile?: boolean;
}

export interface ResourceConfig {
  table: string;
  select?: string;
  singular: string;
  plural: string;
  description: string;
  group: 'Intellectual Property' | 'People' | 'Resources';
  href: string;
  searchKeys: string[];
  defaultSort: { key: string; ascending: boolean };
  columns: Column[];
  fields: Field[];
  filters?: { key: string; label: string; options: { value: string; label: string }[] }[];
}

const STATUS_OPTIONS = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
];

export const RESOURCES: Record<string, ResourceConfig> = {
  patents: {
    table: 'patents',
    singular: 'Patent',
    plural: 'Patents',
    description: 'Inventions, utility models and industrial designs filed by the university.',
    group: 'Intellectual Property',
    href: '/patents',
    searchKeys: ['title', 'inventors', 'category', 'application_no'],
    defaultSort: { key: 'filing_date', ascending: false },
    columns: [
      { key: 'title', label: 'Title', kind: 'strong' },
      { key: 'inventors', label: 'Inventor(s)' },
      { key: 'category', label: 'Category', hideOnMobile: true },
      { key: 'filing_date', label: 'Filed', kind: 'date', hideOnMobile: true },
      { key: 'commercialization', label: 'Commercialization', kind: 'muted', hideOnMobile: true },
    ],
    fields: [
      { key: 'title', label: 'Title of invention', type: 'text', required: true, wide: true },
      { key: 'inventors', label: 'Inventor(s)', type: 'text', required: true, wide: true, placeholder: 'Separate names with semicolons' },
      { key: 'application_no', label: 'Application no.', type: 'text' },
      { key: 'filing_date', label: 'Filing date', type: 'date' },
      { key: 'category', label: 'Category', type: 'select', options: [
        { value: 'Invention Patent', label: 'Invention Patent' },
        { value: 'Utility Model', label: 'Utility Model' },
        { value: 'Industrial Design', label: 'Industrial Design' },
      ] },
      { key: 'commercialization', label: 'Commercialization status', type: 'text', placeholder: 'e.g. Licensed to …' },
    ],
    filters: [{ key: 'category', label: 'Category', options: [
      { value: 'Invention Patent', label: 'Invention Patent' },
      { value: 'Utility Model', label: 'Utility Model' },
      { value: 'Industrial Design', label: 'Industrial Design' },
    ] }],
  },

  trademarks: {
    table: 'trademarks',
    singular: 'Trademark',
    plural: 'Trademarks',
    description: 'Registered marks and brand names owned by the university.',
    group: 'Intellectual Property',
    href: '/trademarks',
    searchKeys: ['mark_name', 'reg_number', 'owner'],
    defaultSort: { key: 'reg_date', ascending: false },
    columns: [
      { key: 'mark_name', label: 'Mark', kind: 'strong' },
      { key: 'reg_number', label: 'Registration no.' },
      { key: 'reg_date', label: 'Registered', kind: 'date', hideOnMobile: true },
      { key: 'owner', label: 'Owner', kind: 'muted', hideOnMobile: true },
    ],
    fields: [
      { key: 'mark_name', label: 'Mark / brand name', type: 'text', required: true, wide: true },
      { key: 'reg_number', label: 'Registration no.', type: 'text' },
      { key: 'reg_date', label: 'Registration date', type: 'date' },
      { key: 'owner', label: 'Owner', type: 'text', wide: true, placeholder: 'Iloilo Science and Technology University' },
    ],
  },

  copyrights: {
    table: 'copyrights',
    singular: 'Copyright',
    plural: 'Copyrights',
    description: 'Books, software, modules and other works with copyright registration.',
    group: 'Intellectual Property',
    href: '/copyrights',
    searchKeys: ['title', 'authors', 'publisher'],
    defaultSort: { key: 'pub_year', ascending: false },
    columns: [
      { key: 'title', label: 'Title', kind: 'strong' },
      { key: 'authors', label: 'Author(s)' },
      { key: 'publisher', label: 'Publisher', hideOnMobile: true },
      { key: 'pub_year', label: 'Year', hideOnMobile: true },
    ],
    fields: [
      { key: 'title', label: 'Title of work', type: 'text', required: true, wide: true },
      { key: 'authors', label: 'Author(s)', type: 'text', required: true, wide: true, placeholder: 'Separate names with semicolons' },
      { key: 'publisher', label: 'Publisher', type: 'text' },
      { key: 'pub_year', label: 'Year published', type: 'year' },
    ],
  },

  research: {
    table: 'research_projects',
    select: '*, researchers(id, full_name)',
    singular: 'Research',
    plural: 'Faculty Research',
    description: 'Research projects by faculty, with industrial applicability and status.',
    group: 'People',
    href: '/research',
    searchKeys: ['title', 'applicability'],
    defaultSort: { key: 'publication_date', ascending: false },
    columns: [
      { key: 'title', label: 'Research title', kind: 'strong' },
      { key: 'researchers', label: 'Researcher', kind: 'relation', relationKey: 'full_name', hideOnMobile: true },
      { key: 'applicability', label: 'Applicability', kind: 'muted', hideOnMobile: true },
      { key: 'status', label: 'Status', kind: 'status' },
      { key: 'publication_date', label: 'Date', kind: 'date', hideOnMobile: true },
    ],
    fields: [
      { key: 'title', label: 'Research title', type: 'text', required: true, wide: true },
      { key: 'researcher_id', label: 'Faculty researcher', type: 'relation', relation: { table: 'researchers', labelKey: 'full_name' }, wide: true },
      { key: 'applicability', label: 'Industrial applicability', type: 'textarea', wide: true },
      { key: 'status', label: 'Status', type: 'select', required: true, options: STATUS_OPTIONS },
      { key: 'publication_date', label: 'Publication date', type: 'date' },
    ],
    filters: [{ key: 'status', label: 'Status', options: STATUS_OPTIONS }],
  },

  graduates: {
    table: 'graduate_students',
    singular: 'Graduate Student',
    plural: 'Graduate School Students',
    description: 'Graduate theses and their applicability to industry.',
    group: 'People',
    href: '/graduates',
    searchKeys: ['full_name', 'thesis_title', 'program', 'college'],
    defaultSort: { key: 'grad_year', ascending: false },
    columns: [
      { key: 'full_name', label: 'Name', kind: 'avatar' },
      { key: 'thesis_title', label: 'Thesis title' },
      { key: 'program', label: 'Program', hideOnMobile: true },
      { key: 'grad_year', label: 'Year', hideOnMobile: true },
    ],
    fields: [
      { key: 'photo_url', label: 'Photo', type: 'image', wide: true },
      { key: 'full_name', label: 'Full name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'thesis_title', label: 'Thesis title', type: 'text', wide: true },
      { key: 'applicability', label: 'Applicability', type: 'textarea', wide: true },
      { key: 'program', label: 'Program / course', type: 'text', placeholder: 'e.g. MS Computer Science' },
      { key: 'college', label: 'College', type: 'text' },
      { key: 'grad_year', label: 'Year graduated', type: 'year' },
      { key: 'address', label: 'Address', type: 'text' },
    ],
  },

  laboratories: {
    table: 'laboratories',
    singular: 'Laboratory',
    plural: 'Research Laboratories',
    description: 'Research laboratories available across campuses.',
    group: 'Resources',
    href: '/laboratories',
    searchKeys: ['name', 'description', 'location'],
    defaultSort: { key: 'name', ascending: true },
    columns: [
      { key: 'name', label: 'Laboratory', kind: 'strong' },
      { key: 'description', label: 'Description', kind: 'muted' },
      { key: 'location', label: 'Location', hideOnMobile: true },
      { key: 'contact', label: 'Contact', hideOnMobile: true },
    ],
    fields: [
      { key: 'name', label: 'Laboratory name', type: 'text', required: true, wide: true },
      { key: 'description', label: 'Description', type: 'textarea', wide: true },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'contact', label: 'Contact person / email', type: 'text' },
    ],
  },

  services: {
    table: 'services',
    singular: 'Service',
    plural: 'Services',
    description: 'Research and testing services offered, with rates.',
    group: 'Resources',
    href: '/services',
    searchKeys: ['name', 'description'],
    defaultSort: { key: 'name', ascending: true },
    columns: [
      { key: 'name', label: 'Service', kind: 'strong' },
      { key: 'description', label: 'Description', kind: 'muted', hideOnMobile: true },
      { key: 'price', label: 'Rate', kind: 'currency' },
      { key: 'unit', label: 'Unit', hideOnMobile: true },
    ],
    fields: [
      { key: 'name', label: 'Service name', type: 'text', required: true, wide: true },
      { key: 'description', label: 'Description', type: 'textarea', wide: true },
      { key: 'price', label: 'Rate (₱)', type: 'currency' },
      { key: 'unit', label: 'Unit', type: 'text', placeholder: 'per sample, per hour …' },
    ],
  },

  equipment: {
    table: 'equipment',
    select: '*, laboratories(id, name)',
    singular: 'Equipment',
    plural: 'Equipment',
    description: 'Research equipment inventory and where it is housed.',
    group: 'Resources',
    href: '/equipment',
    searchKeys: ['name', 'description'],
    defaultSort: { key: 'name', ascending: true },
    columns: [
      { key: 'name', label: 'Equipment', kind: 'strong' },
      { key: 'laboratories', label: 'Laboratory', kind: 'relation', relationKey: 'name', hideOnMobile: true },
      { key: 'condition', label: 'Condition' },
      { key: 'price', label: 'Value', kind: 'currency' },
    ],
    fields: [
      { key: 'name', label: 'Equipment name', type: 'text', required: true, wide: true },
      { key: 'description', label: 'Description', type: 'textarea', wide: true },
      { key: 'laboratory_id', label: 'Laboratory', type: 'relation', relation: { table: 'laboratories', labelKey: 'name' } },
      { key: 'condition', label: 'Condition', type: 'select', options: [
        { value: 'Good', label: 'Good' },
        { value: 'Needs repair', label: 'Needs repair' },
        { value: 'Condemned', label: 'Condemned' },
      ] },
      { key: 'price', label: 'Acquisition cost (₱)', type: 'currency' },
    ],
    filters: [{ key: 'condition', label: 'Condition', options: [
      { value: 'Good', label: 'Good' },
      { value: 'Needs repair', label: 'Needs repair' },
      { value: 'Condemned', label: 'Condemned' },
    ] }],
  },
};

export const RESEARCHER_FIELDS: Field[] = [
  { key: 'photo_url', label: 'Photo', type: 'image', wide: true },
  { key: 'full_name', label: 'Full name', type: 'text', required: true },
  { key: 'researcher_type', label: 'Type', type: 'select', options: [
    { value: 'Faculty', label: 'Faculty' },
    { value: 'Staff', label: 'Staff' },
    { value: 'External', label: 'External collaborator' },
  ] },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'campus', label: 'Campus', type: 'lookup', relation: { table: 'campuses', labelKey: 'name' } },
  { key: 'college', label: 'College', type: 'lookup', relation: { table: 'colleges', labelKey: 'name' } },
  { key: 'research_center', label: 'Research center', type: 'lookup', relation: { table: 'research_centers', labelKey: 'name' } },
  { key: 'expertise', label: 'Expertise (one line)', type: 'text', wide: true },
  { key: 'education', label: 'Educational qualifications', type: 'tags', wide: true, help: 'Press Enter after each degree' },
  { key: 'specializations', label: 'Areas of specialization', type: 'tags', wide: true, help: 'Press Enter after each area' },
];

export const canEdit = (role: Role) => role === 'admin' || role === 'rsd';
export const canDelete = (role: Role) => role === 'admin';
