import Swal from 'sweetalert2'

export async function confirmDelete(message: string): Promise<boolean> {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete',
    cancelButtonText: 'Cancel',
    background: '#111827',
    color: '#f1f5f9',
    iconColor: '#f87171',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#1e293b',
    customClass: {
      popup: 'swal-dark-popup',
      confirmButton: 'swal-confirm-btn',
      cancelButton: 'swal-cancel-btn',
    },
    buttonsStyling: true,
    reverseButtons: true,
    focusCancel: true,
  })
  return result.isConfirmed
}
