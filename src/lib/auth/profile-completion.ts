type ProfileCompletionInput = {
  nik: string | null;
  birthPlace: string | null;
  birthDate: Date | null;
  gender: string | null;
  religion: string | null;
  maritalStatus: string | null;
  phoneNumber: string | null;
  address: string | null;
  photoUrl: string | null;
  userEmail: string | null;
};

export function isEmployeeProfileComplete(input: ProfileCompletionInput) {
  const requiredText = [
    input.nik,
    input.birthPlace,
    input.gender,
    input.religion,
    input.maritalStatus,
    input.phoneNumber,
    input.address,
    input.photoUrl,
    input.userEmail,
  ];

  if (requiredText.some((value) => !value || value.trim().length === 0)) {
    return false;
  }

  return Boolean(input.birthDate);
}
