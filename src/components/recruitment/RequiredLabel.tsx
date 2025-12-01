export const RequiredLabel = ({ text }: { text: string }) => (
  <label className="block mb-1 font-medium">
    {text} <span className="text-red-600">*</span>
  </label>
);

