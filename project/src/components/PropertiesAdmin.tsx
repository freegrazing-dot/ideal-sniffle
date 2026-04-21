import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function PropertiesAdmin() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  async function loadProperties() {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("created_at");

    if (error) console.error(error);
    setProperties(data || []);
    setLoading(false);
  }

  async function updateProperty(id: string, field: string, value: any) {
    const { error } = await supabase
      .from("properties")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Error saving");
    } else {
      loadProperties();
    }
  }

  if (loading) return <div>Loading properties...</div>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Property Admin</h2>

      {properties.map((p) => (
        <div
          key={p.id}
          className="border rounded-lg p-4 bg-white shadow space-y-3"
        >
          <div className="font-semibold text-lg">{p.name}</div>

          <img
            src={p.image_url}
            className="w-48 h-32 object-cover rounded"
          />

          <div className="grid grid-cols-4 gap-3">

            <div>
              <label className="text-xs">Guests</label>
              <input
                type="number"
                value={p.max_guests || 0}
                onChange={(e) =>
                  updateProperty(p.id, "max_guests", Number(e.target.value))
                }
                className="border p-2 w-full rounded"
              />
            </div>

            <div>
              <label className="text-xs">Bedrooms</label>
              <input
                type="number"
                value={p.bedrooms || 0}
                onChange={(e) =>
                  updateProperty(p.id, "bedrooms", Number(e.target.value))
                }
                className="border p-2 w-full rounded"
              />
            </div>

            <div>
              <label className="text-xs">Bathrooms</label>
              <input
                type="number"
                step="0.5"
                value={p.bathrooms || 0}
                onChange={(e) =>
                  updateProperty(p.id, "bathrooms", Number(e.target.value))
                }
                className="border p-2 w-full rounded"
              />
            </div>

            <div>
              <label className="text-xs">Price</label>
              <input
                type="number"
                value={p.price_per_night || 0}
                onChange={(e) =>
                  updateProperty(
                    p.id,
                    "price_per_night",
                    Number(e.target.value)
                  )
                }
                className="border p-2 w-full rounded"
              />
            </div>

          </div>

        </div>
      ))}
    </div>
  );
}