import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../config/supabase';
import { successResponse } from '../utils/apiResponse';
import AppError from '../utils/AppError';
import { clearAuthCookie } from '../utils/jwt';

export interface UserAddress {
  id: string;
  name: string;
  mobile: string;
  pincode: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  type: 'HOME' | 'OFFICE' | 'WORK';
  isDefault: boolean;
  openOnSaturday?: boolean;
  openOnSunday?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  mobile: string;
  gender: string;
  dateOfBirth: string;
  location: string;
  alternateMobile: string;
  hintName: string;
  role: string;
  createdAt: string;
}

// 1. Get Current User Profile
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database not configured', 500);

    // Fetch primary user record
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      throw new AppError('User profile not found', 404);
    }

    // Fetch extended profile metadata from site_settings
    let extendedProfile: Record<string, any> = {};
    const { data: settingRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', `user_profile_${userId}`)
      .maybeSingle();

    if (settingRow && settingRow.value && typeof settingRow.value === 'object') {
      extendedProfile = settingRow.value;
    }

    const combinedProfile: UserProfileData = {
      id: userRow.id,
      name: userRow.name || '',
      email: userRow.email || '',
      mobile: userRow.phone || extendedProfile.mobile || '',
      gender: userRow.gender || extendedProfile.gender || '',
      dateOfBirth: userRow.dateOfBirth || extendedProfile.dateOfBirth || '',
      location: userRow.location || extendedProfile.location || '',
      alternateMobile: userRow.alternateMobile || extendedProfile.alternateMobile || '',
      hintName: userRow.hintName || extendedProfile.hintName || '',
      role: userRow.role || 'user',
      createdAt: userRow.createdAt || userRow.created_at || new Date().toISOString(),
    };

    return successResponse(res, 'User profile fetched successfully', combinedProfile);
  } catch (err) {
    return next(err);
  }
};

// 2. Update User Profile
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database not configured', 500);

    const {
      name,
      mobile,
      gender,
      dateOfBirth,
      location,
      alternateMobile,
      hintName,
    } = req.body;

    const updateFields: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (typeof name === 'string' && name.trim()) {
      updateFields.name = name.trim();
    }
    if (typeof mobile === 'string') {
      updateFields.phone = mobile.trim();
    }
    if (gender !== undefined) {
      updateFields.gender = gender;
    }
    if (dateOfBirth !== undefined) {
      updateFields.dateOfBirth = dateOfBirth;
    }
    if (location !== undefined) {
      updateFields.location = location;
    }
    if (alternateMobile !== undefined) {
      updateFields.alternateMobile = alternateMobile;
    }
    if (hintName !== undefined) {
      updateFields.hintName = hintName;
    }

    // Update main users table in Supabase
    let { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateFields)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.warn('[Account] Updating all columns on users table failed, falling back:', updateError);
      // Fallback: at least update name & phone
      const fallbackFields: Record<string, any> = {
        updatedAt: new Date().toISOString(),
      };
      if (typeof name === 'string' && name.trim()) fallbackFields.name = name.trim();
      if (typeof mobile === 'string') fallbackFields.phone = mobile.trim();
      const fb = await supabase.from('users').update(fallbackFields).eq('id', userId).select().single();
      if (!fb.error && fb.data) updatedUser = fb.data;
    }

    // Upsert extended profile in site_settings as backup
    const extendedData = {
      gender: gender || updatedUser?.gender || '',
      dateOfBirth: dateOfBirth || updatedUser?.dateOfBirth || '',
      location: location || updatedUser?.location || '',
      alternateMobile: alternateMobile || updatedUser?.alternateMobile || '',
      hintName: hintName || updatedUser?.hintName || '',
      mobile: mobile || updatedUser?.phone || '',
    };

    await supabase.from('site_settings').upsert(
      {
        key: `user_profile_${userId}`,
        value: extendedData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    const combinedProfile: UserProfileData = {
      id: updatedUser?.id || userId,
      name: updatedUser?.name || name || '',
      email: updatedUser?.email || '',
      mobile: updatedUser?.phone || mobile || '',
      gender: updatedUser?.gender || extendedData.gender,
      dateOfBirth: updatedUser?.dateOfBirth || extendedData.dateOfBirth,
      location: updatedUser?.location || extendedData.location,
      alternateMobile: updatedUser?.alternateMobile || extendedData.alternateMobile,
      hintName: updatedUser?.hintName || extendedData.hintName,
      role: updatedUser?.role || 'user',
      createdAt: updatedUser?.createdAt || new Date().toISOString(),
    };

    return successResponse(res, 'Profile updated successfully', combinedProfile);
  } catch (err) {
    return next(err);
  }
};

// Helper to fetch user addresses directly from native user_addresses table in Supabase
async function getStoredAddresses(supabase: any, userId: string): Promise<UserAddress[]> {
  try {
    // 1. Fetch metadata from site_settings (for fallback/weekend settings if columns pending)
    let backupMap: Record<string, any> = {};
    const { data: settingRow } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', `user_addresses_${userId}`)
      .maybeSingle();

    if (settingRow && Array.isArray(settingRow.value)) {
      settingRow.value.forEach((item: any) => {
        if (item && item.id) backupMap[item.id] = item;
      });
    }

    // 2. Fetch directly from public.user_addresses table
    const { data: dbRows, error: dbErr } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('createdAt', { ascending: false });

    if (!dbErr && Array.isArray(dbRows) && dbRows.length > 0) {
      return dbRows.map((r: any) => ({
        id: r.id,
        name: r.name,
        mobile: r.mobile,
        pincode: r.pincode,
        address: r.address,
        locality: r.locality,
        city: r.city,
        state: r.state,
        type: (r.type === 'OFFICE' || r.type === 'WORK' ? 'OFFICE' : 'HOME') as 'HOME' | 'OFFICE',
        isDefault: Boolean(r.isDefault),
        openOnSaturday: Boolean(r.openOnSaturday !== undefined ? r.openOnSaturday : backupMap[r.id]?.openOnSaturday),
        openOnSunday: Boolean(r.openOnSunday !== undefined ? r.openOnSunday : backupMap[r.id]?.openOnSunday),
        createdAt: r.createdAt || r.created_at,
        updatedAt: r.updatedAt || r.updated_at,
      }));
    }

    // 3. If dbRows is empty but site_settings has addresses, migrate them to user_addresses table
    if (settingRow && Array.isArray(settingRow.value) && settingRow.value.length > 0) {
      for (const item of settingRow.value) {
        const rowToInsert = {
          id: item.id || `addr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          user_id: userId,
          name: item.name || '',
          mobile: item.mobile || '',
          pincode: item.pincode || '',
          address: item.address || '',
          locality: item.locality || '',
          city: item.city || '',
          state: item.state || '',
          type: item.type === 'OFFICE' || item.type === 'WORK' ? 'OFFICE' : 'HOME',
          isDefault: Boolean(item.isDefault),
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
        };
        await supabase.from('user_addresses').upsert(rowToInsert);
      }
      return settingRow.value;
    }

    return [];
  } catch (err) {
    console.error('[Account] Error fetching addresses:', err);
    return [];
  }
}

// Helper to keep backup in site_settings
async function persistBackupAddresses(supabase: any, userId: string, addresses: UserAddress[]) {
  try {
    await supabase.from('site_settings').upsert(
      {
        key: `user_addresses_${userId}`,
        value: addresses,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch (err) {
    console.warn('[Account] Backup to site_settings failed:', err);
  }
}

// 3. Get User Addresses
export const getAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database not configured', 500);

    const addresses = await getStoredAddresses(supabase, userId);
    return successResponse(res, 'Addresses fetched successfully', addresses);
  } catch (err) {
    return next(err);
  }
};

// 4. Add User Address
export const addAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database not configured', 500);

    const {
      name,
      mobile,
      pincode,
      address,
      locality,
      city,
      state,
      type = 'HOME',
      isDefault = false,
      openOnSaturday = false,
      openOnSunday = false,
    } = req.body;

    if (!name || !mobile || !pincode || !address || !locality || !city || !state) {
      throw new AppError('Please provide all required address details', 400);
    }

    // Check existing address count for default logic
    const { count } = await supabase
      .from('user_addresses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const shouldBeDefault = isDefault || (count === 0);

    if (shouldBeDefault) {
      await supabase
        .from('user_addresses')
        .update({ isDefault: false })
        .eq('user_id', userId);
    }

    const newId = `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const addressType = type === 'OFFICE' || type === 'WORK' ? 'OFFICE' : 'HOME';

    const fullPayload: any = {
      id: newId,
      user_id: userId,
      name: name.trim(),
      mobile: mobile.trim(),
      pincode: pincode.trim(),
      address: address.trim(),
      locality: locality.trim(),
      city: city.trim(),
      state: state.trim(),
      type: addressType,
      isDefault: shouldBeDefault,
      openOnSaturday: Boolean(openOnSaturday),
      openOnSunday: Boolean(openOnSunday),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Insert directly into public.user_addresses table
    let insertResult = await supabase
      .from('user_addresses')
      .insert(fullPayload)
      .select()
      .single();

    if (insertResult.error && insertResult.error.code === 'PGRST204') {
      // openOnSaturday/openOnSunday columns not yet added to user_addresses table
      const { openOnSaturday: _s, openOnSunday: _u, ...standardPayload } = fullPayload;
      insertResult = await supabase
        .from('user_addresses')
        .insert(standardPayload)
        .select()
        .single();
    }

    if (insertResult.error) {
      console.error('[Account] Error saving to user_addresses table:', insertResult.error);
      throw new AppError(insertResult.error.message || 'Failed to save address in database', 500);
    }

    const createdAddress: UserAddress = {
      id: fullPayload.id,
      name: fullPayload.name,
      mobile: fullPayload.mobile,
      pincode: fullPayload.pincode,
      address: fullPayload.address,
      locality: fullPayload.locality,
      city: fullPayload.city,
      state: fullPayload.state,
      type: fullPayload.type,
      isDefault: fullPayload.isDefault,
      openOnSaturday: fullPayload.openOnSaturday,
      openOnSunday: fullPayload.openOnSunday,
      createdAt: fullPayload.createdAt,
      updatedAt: fullPayload.updatedAt,
    };

    // Keep site_settings backup in sync
    const allAddresses = await getStoredAddresses(supabase, userId);
    await persistBackupAddresses(supabase, userId, allAddresses);

    return successResponse(res, 'Address added successfully', createdAddress);
  } catch (err) {
    return next(err);
  }
};

// 5. Update User Address
export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const addressId = req.params.id;
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database not configured', 500);

    const {
      name,
      mobile,
      pincode,
      address,
      locality,
      city,
      state,
      type,
      isDefault,
      openOnSaturday,
      openOnSunday,
    } = req.body;

    if (isDefault) {
      await supabase
        .from('user_addresses')
        .update({ isDefault: false })
        .eq('user_id', userId);
    }

    const updateFields: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (name !== undefined) updateFields.name = name.trim();
    if (mobile !== undefined) updateFields.mobile = mobile.trim();
    if (pincode !== undefined) updateFields.pincode = pincode.trim();
    if (address !== undefined) updateFields.address = address.trim();
    if (locality !== undefined) updateFields.locality = locality.trim();
    if (city !== undefined) updateFields.city = city.trim();
    if (state !== undefined) updateFields.state = state.trim();
    if (type !== undefined) updateFields.type = type === 'OFFICE' || type === 'WORK' ? 'OFFICE' : 'HOME';
    if (isDefault !== undefined) updateFields.isDefault = Boolean(isDefault);
    if (openOnSaturday !== undefined) updateFields.openOnSaturday = Boolean(openOnSaturday);
    if (openOnSunday !== undefined) updateFields.openOnSunday = Boolean(openOnSunday);

    let updateResult = await supabase
      .from('user_addresses')
      .update(updateFields)
      .eq('id', addressId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateResult.error && updateResult.error.code === 'PGRST204') {
      const { openOnSaturday: _s, openOnSunday: _u, ...standardUpdate } = updateFields;
      updateResult = await supabase
        .from('user_addresses')
        .update(standardUpdate)
        .eq('id', addressId)
        .eq('user_id', userId)
        .select()
        .single();
    }

    if (updateResult.error) {
      console.error('[Account] Error updating address in user_addresses table:', updateResult.error);
      throw new AppError(updateResult.error.message || 'Failed to update address in database', 500);
    }

    const row = updateResult.data;
    const updatedAddress: UserAddress = {
      id: row.id,
      name: row.name,
      mobile: row.mobile,
      pincode: row.pincode,
      address: row.address,
      locality: row.locality,
      city: row.city,
      state: row.state,
      type: row.type || 'HOME',
      isDefault: Boolean(row.isDefault),
      openOnSaturday: openOnSaturday !== undefined ? Boolean(openOnSaturday) : Boolean(row.openOnSaturday),
      openOnSunday: openOnSunday !== undefined ? Boolean(openOnSunday) : Boolean(row.openOnSunday),
      createdAt: row.createdAt || row.created_at,
      updatedAt: row.updatedAt || row.updated_at,
    };

    // Keep site_settings backup in sync
    const allAddresses = await getStoredAddresses(supabase, userId);
    await persistBackupAddresses(supabase, userId, allAddresses);

    return successResponse(res, 'Address updated successfully', updatedAddress);
  } catch (err) {
    return next(err);
  }
};

// 6. Delete User Address
export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const addressId = req.params.id;
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database not configured', 500);

    // Get the address to check if it was default
    const { data: target } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('id', addressId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!target) throw new AppError('Address not found', 404);

    // Delete from public.user_addresses table
    const { error: delErr } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', userId);

    if (delErr) {
      console.error('[Account] Error deleting address:', delErr);
      throw new AppError(delErr.message || 'Failed to delete address', 500);
    }

    // If deleted address was default, promote the newest remaining address to default
    if (target.isDefault) {
      const { data: remaining } = await supabase
        .from('user_addresses')
        .select('id')
        .eq('user_id', userId)
        .order('createdAt', { ascending: false })
        .limit(1);

      if (remaining && remaining.length > 0) {
        await supabase
          .from('user_addresses')
          .update({ isDefault: true })
          .eq('id', remaining[0].id)
          .eq('user_id', userId);
      }
    }

    // Keep site_settings backup in sync
    const allAddresses = await getStoredAddresses(supabase, userId);
    await persistBackupAddresses(supabase, userId, allAddresses);

    return successResponse(res, 'Address deleted successfully', { id: addressId });
  } catch (err) {
    return next(err);
  }
};

// 7. Set Default Address
export const setDefaultAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const addressId = req.params.id;
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database not configured', 500);

    // Reset default on all user addresses
    await supabase
      .from('user_addresses')
      .update({ isDefault: false })
      .eq('user_id', userId);

    // Set default on target address
    const { data: updated, error } = await supabase
      .from('user_addresses')
      .update({ isDefault: true, updatedAt: new Date().toISOString() })
      .eq('id', addressId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !updated) {
      throw new AppError('Address not found', 404);
    }

    // Keep backup in sync
    const allAddresses = await getStoredAddresses(supabase, userId);
    await persistBackupAddresses(supabase, userId, allAddresses);

    return successResponse(res, 'Default address updated successfully', updated);
  } catch (err) {
    return next(err);
  }
};

// 8. Delete Account
export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const supabase = getSupabaseAdmin();
    if (!supabase) throw new AppError('Database not configured', 500);

    // 1. Delete or deactivate user in public.users
    await supabase.from('users').delete().eq('id', userId);

    // 2. Remove user metadata from site_settings
    await supabase.from('site_settings').delete().eq('key', `user_profile_${userId}`);
    await supabase.from('site_settings').delete().eq('key', `user_addresses_${userId}`);

    // 3. Delete from Supabase Auth if exists
    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (e) {
      console.warn('[Account] Supabase auth delete error:', e);
    }

    // Clear auth cookie
    clearAuthCookie(res);

    return successResponse(res, 'Account has been deleted successfully', { deleted: true });
  } catch (err) {
    return next(err);
  }
};

// 9. Get User Orders
export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    // Placeholder / empty orders list for plush teddy bags orders
    return successResponse(res, 'Orders fetched successfully', []);
  } catch (err) {
    return next(err);
  }
};
