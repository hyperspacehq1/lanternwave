export default function RecordView({ record, schema }) {
  return (
    <div className="record">
      {schema.map(({ key, label, type }) => {
        const value = record[key];
        if (value == null || value === "") return null;

        if (type === "json") {
          return (
            <div key={key}>
              <strong>{label}</strong>
              <pre>{JSON.stringify(value, null, 2)}</pre>
            </div>
          );
        }

        return (
          <div key={key}>
            <strong>{label}</strong>
            <div>{String(value)}</div>
          </div>
        );
      })}
    </div>
  );
}
