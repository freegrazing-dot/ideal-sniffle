import { Home, Wifi, Tv, UtensilsCrossed, Waves, Bike, ShieldAlert, Phone, Clock, Key, WashingMachine, Sparkles } from 'lucide-react';

export default function WelcomeGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-teal-100 rounded-full mb-4">
            <Sparkles className="w-12 h-12 text-teal-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Karen's Seafoam Oasis
          </h1>
          <p className="text-xl text-teal-600 mb-2">Your coastal getaway in Bonita Springs, Florida</p>
          <p className="text-gray-600">
            We're so glad you're here. Below is your complete arrival, house, and property guide.
            If you have any questions at any time, please don't hesitate to reach out.
          </p>
        </div>

        <div className="space-y-8">
          <Section icon={<Phone className="w-6 h-6" />} title="Emergency Contacts" color="red">
            <ContactCard name="Heather" phone="479-899-2013" />
            <ContactCard name="Mark" phone="970-261-2124" />
          </Section>

          <Section icon={<Clock className="w-6 h-6" />} title="Check-In / Check-Out" color="teal">
            <InfoGrid>
              <InfoItem label="Check-In" value="4:00 PM" />
              <InfoItem label="Check-Out" value="11:00 AM" />
            </InfoGrid>
          </Section>

          <Section icon={<Key className="w-6 h-6" />} title="Front Door Lock (Ultraloq Keypad)" color="teal">
            <Instructions>
              <li>Enter your 4-digit code, then press the Ultraloq button to unlock.</li>
              <li>When leaving, press the Ultraloq button again to lock.</li>
              <li className="text-amber-700 font-medium">Please do not turn the doorknob lock, as this can cause a lockout.</li>
              <li>The door does not auto-lock, so be sure to press the button before you go.</li>
            </Instructions>
          </Section>

          <Section icon={<Wifi className="w-6 h-6" />} title="Wi-Fi Information" color="teal">
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-teal-200">
              <InfoGrid>
                <InfoItem label="Network" value="Crosby" />
                <InfoItem label="Password" value="tay6lor7" />
              </InfoGrid>
              <p className="text-sm text-gray-600 mt-3">Wi-Fi details are also posted inside the home for easy reference.</p>
            </div>
          </Section>

          <Section icon={<Home className="w-6 h-6" />} title="General Information" color="teal">
            <Instructions>
              <li><strong>Sprinklers:</strong> Run automatically each morning.</li>
              <li><strong>Extra Bedding:</strong> Hall closet.</li>
              <li><strong>Beds:</strong> All beds are protected with waterproof mattress covers.</li>
              <li><strong>High Chair / Pack-and-Play:</strong> Available upon request — just let us know.</li>
            </Instructions>
          </Section>

          <Section icon={<ShieldAlert className="w-6 h-6" />} title="Comfort & Essentials" color="teal">
            <Instructions>
              <li><strong>First Aid Kits:</strong> Hall closet and above the dryer.</li>
              <li><strong>Fire Extinguisher:</strong> Above the dryer.</li>
              <li><strong>Box Fan:</strong> Hall closet.</li>
              <li><strong>Two Robes:</strong> Master bedroom closet.</li>
              <li><strong>Vacuum & Attachments:</strong> Master bedroom closet (on charger).</li>
              <li><strong>Broom, Dustpan & Mop:</strong> Mounted near the dryer.</li>
            </Instructions>
          </Section>

          <Section icon={<WashingMachine className="w-6 h-6" />} title="Laundry" color="teal">
            <Instructions>
              <li>Full-size washer and dryer available.</li>
              <li>Starter detergent provided for 2 loads.</li>
              <li>Please supply additional detergent if needed.</li>
            </Instructions>
          </Section>

          <Section icon={<Tv className="w-6 h-6" />} title="TV & Entertainment" color="teal">
            <p className="text-gray-700 mb-4">There are four TVs in the home:</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-teal-50 rounded-lg p-3 text-center">Living Room</div>
              <div className="bg-teal-50 rounded-lg p-3 text-center">Dining Area</div>
              <div className="bg-teal-50 rounded-lg p-3 text-center">Lanai</div>
              <div className="bg-teal-50 rounded-lg p-3 text-center">Master Bedroom</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-900 mb-3">TV Setup</h4>
              <Instructions>
                <li>All TVs include DirectTV and Roku / Smart TV apps.</li>
                <li>Each TV has two remotes (DirectTV + TV remote).</li>
              </Instructions>
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">Dining Room TV</h4>
              <Instructions>
                <li>Use the DirectTV remote and press ON for satellite TV.</li>
                <li>For apps (Netflix, Hulu, etc.), switch to the TV remote and press Home.</li>
              </Instructions>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Other TVs</h4>
              <Instructions>
                <li>Power on using the DirectTV remote.</li>
                <li>Hold Enter on the DirectTV remote to switch inputs:
                  <ul className="ml-6 mt-2 space-y-1">
                    <li>Input 1: DirectTV</li>
                    <li>Input 2: Roku / Smart Apps</li>
                  </ul>
                </li>
              </Instructions>
            </div>
          </Section>

          <Section icon={<UtensilsCrossed className="w-6 h-6" />} title="Kitchen & Supplies" color="teal">
            <p className="text-gray-700 mb-4">The kitchen is fully stocked for your stay.</p>

            <div className="space-y-4">
              <SubSection title="Appliances">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <li>Refrigerator with filtered water & ice</li>
                  <li>Microwave</li>
                  <li>Toaster</li>
                  <li>Dishwasher</li>
                  <li>Air fryer</li>
                  <li>Keurig</li>
                  <li>Pressure cooker</li>
                  <li>Garbage disposal</li>
                </div>
              </SubSection>

              <SubSection title="Cookware & Dishes">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <li>Pots, pans, knives</li>
                  <li>Measuring cups/spoons</li>
                  <li>Strainer</li>
                  <li>Baking dishes & muffin tin</li>
                  <li>Glassware</li>
                  <li>Picnic-style dishware (dishwasher safe)</li>
                </div>
              </SubSection>

              <SubSection title="Supplies Provided">
                <Instructions>
                  <li>Starter dish tabs</li>
                  <li>Trash bags</li>
                  <li>Dish soap, hand soap, and a new sponge</li>
                  <li>5 starter K-cups</li>
                  <li>Laundry detergent for two loads</li>
                </Instructions>
              </SubSection>

              <div className="bg-teal-50 rounded-lg p-4 border-l-4 border-teal-400">
                <h4 className="font-semibold text-gray-900 mb-2">Guest Pantry</h4>
                <p className="text-gray-700">Shared "guest pantry" with seasonings. You're welcome to use or contribute items during your stay.</p>
              </div>
            </div>
          </Section>

          <Section icon={<Waves className="w-6 h-6" />} title="Bathrooms & Outdoor Shower" color="teal">
            <Instructions>
              <li>Starter supplies provided: toilet paper, hand soap, and a small travel-size shower kit.</li>
              <li>Please supply additional items if needed.</li>
            </Instructions>

            <div className="mt-4 bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
              <h4 className="font-semibold text-gray-900 mb-2">Outdoor Shower</h4>
              <Instructions>
                <li>City water</li>
                <li>Single temperature (typically warm)</li>
                <li>Great before using the spa or returning from the beach</li>
              </Instructions>
            </div>
          </Section>

          <Section icon={<Waves className="w-6 h-6" />} title="Spa & Outdoor Relaxation" color="teal">
            <div className="space-y-4">
              <SubSection title="Salt-Water Spa">
                <p className="text-gray-700 mb-3">Maintained regularly with chlorine. Please rinse off sand using the outdoor shower before entering.</p>
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-900 mb-2">How to use:</h5>
                  <Instructions>
                    <li>Remove the cover.</li>
                    <li>Press Jets (high / low / off).</li>
                    <li>To adjust temperature: Options → Temperature, then use arrows.</li>
                    <li className="font-medium text-blue-900">Always turn off jets and replace the cover when finished.</li>
                  </Instructions>
                </div>
              </SubSection>

              <SubSection title="Fire Pit">
                <Instructions>
                  <li>Traditional wood-burning fire pit.</li>
                  <li className="text-amber-700 font-medium">Check for local fire bans before use.</li>
                  <li>Fully extinguish before leaving unattended.</li>
                </Instructions>
              </SubSection>

              <SubSection title="Propane Grill">
                <Instructions>
                  <li>Standard propane grill available.</li>
                  <li>Open propane slowly before lighting.</li>
                  <li>Use grill tools provided.</li>
                  <li>After use: turn off grill, close propane, and wipe down.</li>
                </Instructions>
              </SubSection>
            </div>
          </Section>

          <Section icon={<Bike className="w-6 h-6" />} title="Fun & Adventure" color="teal">
            <div className="space-y-4">
              <SubSection title="Electric Scooters (2)">
                <Instructions>
                  <li>Located on the back porch.</li>
                  <li><strong>Lock Code:</strong> 78410</li>
                  <li>Helmets recommended.</li>
                  <li>Bring the lock (in the basket) when out.</li>
                  <li>Return scooters to the porch and plug them in after use.</li>
                </Instructions>
              </SubSection>

              <SubSection title="Paddle Board">
                <Instructions>
                  <li>Paddle and life jackets available.</li>
                  <li><strong>Recommended bay access:</strong> 260 3rd Street West</li>
                  <li className="text-red-700 font-medium">Do NOT use the pond behind the house for paddling or swimming (wildlife area only).</li>
                </Instructions>
              </SubSection>

              <SubSection title="Beach Gear Provided">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <li>Cooler</li>
                  <li>Beach chairs with built-in coolers</li>
                  <li>Umbrella</li>
                  <li>Goggles</li>
                  <li>Floats</li>
                  <li>Sand toys</li>
                  <li>Scooters</li>
                </div>
              </SubSection>

              <SubSection title="Beach Access">
                <p className="text-gray-700 mb-2"><strong>Closest beach:</strong> Barefoot Beach (approximately 1.3 miles)</p>
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-900 mb-2">Parking options:</h5>
                  <Instructions>
                    <li>Paid lot near the restaurant (main access)</li>
                    <li>Alternate lot at 136 Barefoot Circle (less obvious but more affordable)</li>
                  </Instructions>
                </div>
              </SubSection>
            </div>
          </Section>

          <Section icon={<Sparkles className="w-6 h-6" />} title="Arrival Gift" color="teal">
            <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-6 border-2 border-teal-200">
              <p className="text-gray-700 mb-3">
                This home is part of our small family business and dream. The shells and keepsakes you'll find come from generations of beach trips.
              </p>
              <p className="text-gray-700 font-medium">
                Please enjoy your welcome gift — take what you love. Any remaining items will be shared with future guests.
              </p>
            </div>
          </Section>

          <Section icon={<Home className="w-6 h-6" />} title="Guest Supplies & Sustainability" color="teal">
            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-400">
              <p className="text-gray-700 mb-3">We love a "pay-it-forward" spirit.</p>
              <p className="text-gray-700 mb-3">
                If you purchase items you can't take home (condiments, shampoo, beach toys, etc.), please place them in the Guest Supplies bin. Items will be reused or restocked for future guests.
              </p>
              <p className="text-gray-700 font-medium">Every stay includes a fresh starter set, regardless.</p>
            </div>
          </Section>

          <Section icon={<Home className="w-6 h-6" />} title="Property Notes" color="teal">
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700"><strong>Owner's Shed:</strong> Locked and used only for supplies. No one stays inside; please do not attempt entry.</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700"><strong>Security Camera:</strong> One front-yard camera only. Camera is disarmed during your stay for full privacy.</p>
              </div>
            </div>
          </Section>

          <Section icon={<Clock className="w-6 h-6" />} title="Check-Out Instructions" color="teal">
            <div className="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-400">
              <p className="text-gray-700 mb-3">No need to make the beds — leaving them unmade helps housekeeping.</p>
              <p className="text-gray-700 mb-2 font-semibold">Please ensure:</p>
              <Instructions>
                <li>Spa is turned off and covered</li>
                <li>Grill is turned off and propane closed</li>
                <li>Doors are locked</li>
                <li>All personal belongings are taken</li>
              </Instructions>
            </div>
          </Section>

          <div className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-xl p-8 text-center text-white shadow-lg">
            <h3 className="text-2xl font-bold mb-3">We hope you have a relaxing and memorable stay</h3>
            <p className="text-lg mb-2">at Karen's Seafoam Oasis</p>
            <p className="text-teal-100">Thank you for choosing our home — enjoy your time in beautiful Bonita Springs</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  const colorClasses = {
    red: 'bg-red-100 text-red-600',
    teal: 'bg-teal-100 text-teal-600',
  }[color];

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className={`${colorClasses} px-6 py-4 flex items-center gap-3`}>
        {icon}
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-gray-300 pl-4">
      <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
      <ul className="space-y-2 text-gray-700">
        {children}
      </ul>
    </div>
  );
}

function ContactCard({ name, phone }: { name: string; phone: string }) {
  return (
    <div className="bg-red-50 rounded-lg p-4 mb-3 last:mb-0">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-900">{name}</span>
        <a href={`tel:${phone}`} className="text-red-600 font-mono hover:text-red-700 transition-colors">
          {phone}
        </a>
      </div>
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function Instructions({ children }: { children: React.ReactNode }) {
  return (
    <ul className="space-y-2 text-gray-700">
      {children}
    </ul>
  );
}
