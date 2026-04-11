const [activeTab, setActiveTab] = useState<
  'list'
  | 'calendar'
  | 'properties'
  | 'rentals'
  | 'taxes'
  | 'settings'
  | 'banners'
  | 'promo-codes'
>('settings');