import Input from '../ui/Input.jsx'

export default function ShippingForm({ values, errors, onChange }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Input
          id="fullName"
          name="fullName"
          label="Full name"
          autoComplete="name"
          value={values.fullName}
          onChange={onChange}
          error={errors.fullName}
        />
      </div>
      <div className="sm:col-span-2">
        <Input
          id="addressLine1"
          name="addressLine1"
          label="Address line 1"
          autoComplete="address-line1"
          value={values.addressLine1}
          onChange={onChange}
          error={errors.addressLine1}
        />
      </div>
      <div className="sm:col-span-2">
        <Input
          id="addressLine2"
          name="addressLine2"
          label="Address line 2 (optional)"
          autoComplete="address-line2"
          value={values.addressLine2}
          onChange={onChange}
        />
      </div>
      <Input
        id="city"
        name="city"
        label="City"
        autoComplete="address-level2"
        value={values.city}
        onChange={onChange}
        error={errors.city}
      />
      <Input
        id="state"
        name="state"
        label="State"
        autoComplete="address-level1"
        value={values.state}
        onChange={onChange}
        error={errors.state}
      />
      <Input
        id="postalCode"
        name="postalCode"
        label="Postal code"
        autoComplete="postal-code"
        value={values.postalCode}
        onChange={onChange}
        error={errors.postalCode}
      />
      <Input
        id="country"
        name="country"
        label="Country"
        autoComplete="country-name"
        value={values.country}
        onChange={onChange}
        error={errors.country}
      />
    </div>
  )
}
