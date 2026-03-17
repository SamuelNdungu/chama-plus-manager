import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChama } from '@/context/ChamaContext';
import { toast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const assetTypes = ['land', 'vehicle', 'building', 'equipment', 'shares', 'business', 'other'];

const assetSchema = z.object({
  name: z.string().min(1, { message: 'Asset name is required' }),
  assetType: z.enum(['land', 'vehicle', 'building', 'equipment', 'shares', 'business', 'other'], {
    required_error: 'Asset type is required',
  }),
  description: z.string().optional(),
  purchaseDate: z.date({ required_error: 'Purchase date is required' }),
  purchaseValue: z.coerce.number().positive({ message: 'Purchase value must be positive' }),
  currentValue: z.coerce.number().positive({ message: 'Current value must be positive' }),
  location: z.string().optional(),
  serialNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  titleDeedNumber: z.string().optional(),
  landSize: z.coerce.number().positive().optional(),
  landUnit: z.enum(['acres', 'hectares', 'sqm']).optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  notes: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

const AddAssetForm = () => {
  const navigate = useNavigate();
  const { chama } = useChama();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: '',
      assetType: undefined,
      description: '',
      purchaseDate: new Date(),
      purchaseValue: 0,
      currentValue: 0,
      location: '',
      serialNumber: '',
      registrationNumber: '',
      titleDeedNumber: '',
      landSize: undefined,
      landUnit: undefined,
      make: '',
      model: '',
      year: undefined,
      notes: '',
    },
  });

  const selectedAssetType = form.watch('assetType');

  const onSubmit = async (data: AssetFormValues) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          chama_id: chama?.id,
          name: data.name,
          asset_type: data.assetType,
          description: data.description,
          purchase_date: format(data.purchaseDate, 'yyyy-MM-dd'),
          purchase_value: data.purchaseValue,
          current_value: data.currentValue,
          location: data.location,
          serial_number: data.serialNumber,
          registration_number: data.registrationNumber,
          title_deed_number: data.titleDeedNumber,
          land_size: data.landSize,
          land_unit: data.landUnit,
          make: data.make,
          model: data.model,
          year: data.year,
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add asset');
      }

      toast({
        title: 'Success!',
        description: 'Asset has been added successfully',
      });

      navigate('/assets');
    } catch (error) {
      console.error('Error adding asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to add asset. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-5">
        <h3 className="text-lg font-medium">Asset Details</h3>
        <p className="text-sm text-muted-foreground">
          Enter the details of the new asset
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter asset name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assetType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asset Type*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="land">Land</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                      <SelectItem value="building">Building</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="shares">Shares</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Purchase Date*</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchaseValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Value (KSh)*</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currentValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Value (KSh)*</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Asset location" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Land-specific fields */}
          {selectedAssetType === 'land' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 border-t pt-6">
              <FormField
                control={form.control}
                name="titleDeedNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title Deed Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter title deed number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="landSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Land Size</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="Enter land size" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="landUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="acres">Acres</SelectItem>
                        <SelectItem value="hectares">Hectares</SelectItem>
                        <SelectItem value="sqm">Square Meters</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Vehicle-specific fields */}
          {selectedAssetType === 'vehicle' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4 border-t pt-6">
              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., KDE 123A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Toyota" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Hilux" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 2020" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Equipment-specific fields */}
          {(selectedAssetType === 'equipment' || selectedAssetType === 'other') && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 border-t pt-6">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter serial number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter registration number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Description and Notes */}
          <div className="grid grid-cols-1 gap-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter asset description" 
                      className="min-h-[100px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional notes about this asset" 
                      className="min-h-[80px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/assets')}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-chama-purple hover:bg-chama-dark-purple"
            >
              {isLoading ? 'Adding...' : 'Add Asset'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AddAssetForm;
