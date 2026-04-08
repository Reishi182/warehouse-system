# Implementation Plan: Stok Opname

## Overview

This implementation plan transforms the current single-record stock opname approach into a comprehensive session-based workflow with multi-unit support. The feature enables warehouse and cashier roles to create stock counting sessions, add products with flexible unit recording, and submit for approval by the main office role. The implementation follows a 5-phase approach: database setup, backend logic, UI components, integration, and testing.

## Tasks

- [ ] 1. Database Setup
  - [x] 1.1 Create stock_opname_sessions table with indexes
    - Create table with fields: id, session_number, location, status, created_by, created_by_name, approved_by, approved_by_name, approved_at, rejected_reason, submitted_at, created_at, updated_at
    - Add CHECK constraints for location and status
    - Create indexes on status, location, and created_by
    - _Requirements: 1.1, 1.2_
  
  - [x] 1.2 Create stock_opname_items table with indexes
    - Create table with fields: id, session_id, product_id, system_stock, actual_stock, difference, unit_used, main_unit_count, sub_unit_count, note, status, approved_by, approved_by_name, approved_at, created_at
    - Add UNIQUE constraint on (session_id, product_id)
    - Add CHECK constraint for status
    - Create indexes on session_id, product_id, and status
    - Add CASCADE delete on session_id foreign key
    - _Requirements: 2.1, 2.2, 3.1_
  
  - [x] 1.3 Create generate_stock_opname_number RPC function
    - Implement function to generate session numbers in format SO-YYYYMMDD-XXXX
    - Use sequence based on date to ensure uniqueness
    - _Requirements: 1.1_
  
  - [x] 1.4 Create approve_stock_opname_item RPC function
    - Implement function to approve individual items
    - Update product stock based on location (stock_gudang or stock_toko)
    - Apply difference to current stock with non-negative constraint
    - Insert stock_logs entry with type 'adjustment'
    - Insert activity_logs entry
    - Update item status to 'approved'
    - Return JSON with old_stock, new_stock, and difference
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 14.1, 14.2, 14.3, 14.4_
  
  - [x] 1.5 Set up Row Level Security (RLS) policies
    - Create policy for sessions: users can view own sessions or all if office/admin
    - Create policy for sessions: only warehouse/cashier can create
    - Create policy for sessions: only creator can update draft sessions
    - Create policy for items: inherit session permissions
    - Create policy for items: only creator can insert to draft sessions
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [ ] 2. Backend Logic - Core Hooks
  - [-] 2.1 Implement useStockOpnameSessions hook
    - Create query hook with filters for status, location, dateFrom, dateTo
    - Fetch sessions with joined items and products
    - Order by created_at descending
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [~] 2.2 Implement useCreateStockOpnameSession hook
    - Call generate_stock_opname_number RPC
    - Insert new session with status 'draft'
    - Invalidate sessions query cache
    - Show success toast
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [~] 2.3 Implement useAddProductToSession hook
    - Validate session is in 'draft' status
    - Validate product not already in session
    - Get current system stock based on location
    - Calculate difference (actual_stock - system_stock)
    - Insert item with status 'pending'
    - Invalidate sessions query cache
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 12.2_
  
  - [~] 2.4 Implement useUpdateProductInSession hook
    - Validate session is in 'draft' status
    - Recalculate difference based on new actual_stock
    - Update item in database
    - Invalidate sessions query cache
    - _Requirements: 4.1, 4.3_
  
  - [~] 2.5 Implement useRemoveProductFromSession hook
    - Validate session is in 'draft' status
    - Delete item from database
    - Invalidate sessions query cache
    - _Requirements: 4.2_

- [ ] 3. Backend Logic - Submission and Approval
  - [~] 3.1 Implement useSubmitSession hook
    - Validate session has at least one item
    - Validate session is in 'draft' status
    - Update session status to 'pending_approval'
    - Set submitted_at timestamp
    - Create notifications for main_office users
    - Insert activity log with action 'submit_stock_opname'
    - Invalidate sessions query cache
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 10.2, 15.1, 15.2, 15.3, 15.4_
  
  - [~] 3.2 Implement useApproveItem hook
    - Validate session is in 'pending_approval' status
    - Validate item is in 'pending' status
    - Call approve_stock_opname_item RPC function
    - Show confirmation dialog before approval
    - Invalidate sessions and products query cache
    - Show success toast
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 10.3_
  
  - [~] 3.3 Implement useApproveAllItems hook
    - Validate session is in 'pending_approval' status
    - Show confirmation dialog with summary
    - Loop through all pending items and call approve_stock_opname_item RPC
    - Handle errors gracefully (stop on first error)
    - Update session status to 'completed' when all items approved
    - Create notification for session creator
    - Invalidate sessions and products query cache
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 16.1, 16.3_
  
  - [~] 3.4 Implement useRejectSession hook
    - Validate session is in 'pending_approval' status
    - Show dialog to input rejection reason
    - Update session status to 'rejected'
    - Set rejected_reason and timestamp
    - Create notification for session creator with reason
    - Insert activity log with action 'reject_stock_opname'
    - Invalidate sessions query cache
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.4, 16.2, 16.3_

- [ ] 4. UI Components - Session Management
  - [~] 4.1 Create SessionList component
    - Display table of sessions with columns: session_number, location, status, created_by_name, created_at, item count
    - Add filters for status, location, and date range
    - Add sorting by created_at
    - Add click handler to navigate to session detail
    - Show status badges with appropriate colors
    - _Requirements: 6.1, 6.2, 6.5, 11.1, 11.2, 11.3_
  
  - [~] 4.2 Create SessionForm component
    - Add "Create New Session" button
    - Show dialog with location selector (gudang/toko)
    - Call useCreateStockOpnameSession on submit
    - Navigate to session detail after creation
    - _Requirements: 1.1, 1.3_
  
  - [~] 4.3 Create ProductSelector component
    - Integrate with existing ProductSearchSelect or create new
    - Add barcode scanner support
    - Show product info: name, barcode, current system stock
    - Disable products already in session
    - _Requirements: 2.1, 2.2_
  
  - [~] 4.4 Create MultiUnitInput component
    - Show unit options based on product configuration
    - For multi-unit products: show main_unit and sell_unit inputs
    - Allow input in main_unit only, sell_unit only, or combination
    - Calculate and display total in sell_unit
    - Show conversion formula (e.g., "1 SAK = 50 KG")
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_
  
  - [~] 4.5 Create SessionDetail component
    - Display session header: session_number, location, status, creator, dates
    - Show ProductSelector for adding products (only in draft status)
    - Display table of items with columns: product_name, system_stock, actual_stock, difference, unit_used, note, actions
    - Show edit and delete buttons for each item (only in draft status)
    - Show "Submit for Approval" button (only in draft with items)
    - Disable editing when status is not 'draft'
    - _Requirements: 4.4, 5.1, 5.5, 6.3_
  
  - [~] 4.6 Create SessionSummary component
    - Display total number of products
    - Display count of products with positive difference (surplus)
    - Display count of products with negative difference (shortage)
    - Display count of products with zero difference
    - Calculate and display total value difference in Rupiah
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

- [ ] 5. UI Components - Approval Interface
  - [~] 5.1 Create ApprovalInterface component
    - Display session details for office review
    - Show table of items with all details
    - Add "Approve" button for each pending item
    - Add "Approve All" button at top
    - Add "Reject Session" button
    - Show confirmation dialogs for all actions
    - Display approved items with checkmark and timestamp
    - Only show for main_office role
    - _Requirements: 6.3, 6.4, 7.1, 7.7, 8.1, 8.2, 9.1_
  
  - [~] 5.2 Create ItemApprovalRow component
    - Display item details: product name, system stock, actual stock, difference
    - Show unit information for multi-unit products
    - Display note if present
    - Show "Approve" button for pending items
    - Show approval status and approver for approved items
    - Highlight positive differences in green, negative in red
    - _Requirements: 6.3, 7.1, 7.5_
  
  - [~] 5.3 Create RejectSessionDialog component
    - Show dialog with textarea for rejection reason
    - Validate that reason is not empty
    - Call useRejectSession on submit
    - _Requirements: 9.2, 9.3, 9.4_

- [ ] 6. Integration and Wiring
  - [~] 6.1 Add TypeScript types to src/types/index.ts
    - Add StockOpnameSessionStatus type
    - Add StockOpnameItemStatus type
    - Add StockOpnameSession interface
    - Add StockOpnameItem interface
    - _Requirements: All_
  
  - [~] 6.2 Create main StockOpname page component
    - Add tabs for "My Sessions", "Pending Approval" (office only), "History"
    - Integrate SessionList component
    - Integrate SessionForm component
    - Add routing for session detail page
    - _Requirements: 6.1, 11.1_
  
  - [~] 6.3 Create SessionDetailPage component
    - Integrate SessionDetail component
    - Integrate SessionSummary component
    - Integrate ApprovalInterface component (for office role)
    - Handle session loading and error states
    - _Requirements: 6.3, 11.4_
  
  - [~] 6.4 Add navigation menu item
    - Add "Stok Opname" menu item for warehouse, cashier, and office roles
    - Add icon and route to navigation
    - _Requirements: 17.1, 17.2_
  
  - [~] 6.5 Integrate with notifications system
    - Ensure notifications are created on submit, approve, and reject
    - Add click handlers to navigate to session detail
    - _Requirements: 15.1, 15.2, 15.3, 16.1, 16.2, 16.3_
  
  - [~] 6.6 Add export functionality
    - Create ExportButton component for session list
    - Generate Excel/CSV with all session data
    - Include columns: session_number, date, user, location, product_name, barcode, system_stock, actual_stock, difference, status, note
    - Format filename as "stok-opname-{date}-{location}.xlsx"
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 7. Utility Functions and Helpers
  - [~] 7.1 Create multi-unit conversion utilities
    - Implement convertToSubUnit(mainUnitCount, subUnitCount, pcsPerBox)
    - Implement formatMultiUnitStock(stock, pcsPerBox, mainUnit, sellUnit)
    - Implement parseMultiUnitInput(input, pcsPerBox)
    - _Requirements: 3.2, 3.3, 13.2, 13.3_
  
  - [~] 7.2 Create validation utilities
    - Implement validateStockValue(value) - non-negative check
    - Implement validateSessionForSubmit(session) - has items check
    - Implement validateMultiUnitConversion(pcsPerBox) - valid conversion
    - _Requirements: 12.1, 12.2, 12.4_
  
  - [~] 7.3 Create difference calculation utility
    - Implement calculateDifference(actualStock, systemStock)
    - Round to 2 decimals
    - Return with proper sign (positive/negative)
    - _Requirements: 13.1, 13.4, 13.5_
  
  - [~] 7.4 Create error message constants
    - Define ERROR_MESSAGES object with all error messages
    - Include messages for validation failures, unauthorized access, not found errors
    - _Requirements: 12.5_

- [ ] 8. Checkpoint - Core functionality complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Testing and Polish
  - [~] 9.1 Write unit tests for multi-unit conversion functions
    - Test convertToSubUnit with various inputs
    - Test formatMultiUnitStock display formatting
    - Test edge cases: zero values, null pcsPerBox, decimal values
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [~] 9.2 Write unit tests for validation functions
    - Test validateStockValue with negative, zero, positive values
    - Test validateSessionForSubmit with empty and non-empty sessions
    - Test validateMultiUnitConversion with valid and invalid pcsPerBox
    - _Requirements: 12.1, 12.2, 12.4_
  
  - [~] 9.3 Write unit tests for difference calculation
    - Test calculateDifference with positive, negative, zero differences
    - Test rounding to 2 decimals
    - Test with multi-unit products
    - _Requirements: 13.1, 13.5_
  
  - [~] 9.4 Write integration tests for session workflow
    - Test create session → add products → submit → approve flow
    - Test create session → add products → submit → reject flow
    - Verify stock updated correctly after approval
    - Verify stock unchanged after rejection
    - _Requirements: 1.1, 2.1, 5.1, 7.1, 8.1, 9.1_
  
  - [~] 9.5 Write integration tests for concurrent access
    - Test two users trying to approve same item
    - Test editing session while office is reviewing
    - Verify proper error handling and locking
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
  
  - [~] 9.6 Perform user acceptance testing
    - Test complete workflow as warehouse user
    - Test complete workflow as cashier user
    - Test approval workflow as office user
    - Test with various product types (single-unit and multi-unit)
    - Verify all notifications are sent correctly
    - _Requirements: All_
  
  - [~] 9.7 Fix bugs and refine UX
    - Address any issues found during testing
    - Improve error messages and user feedback
    - Optimize loading states and transitions
    - _Requirements: All_
  
  - [~] 9.8 Performance optimization
    - Add pagination for large session lists
    - Implement virtual scrolling for product selector
    - Optimize database queries with proper indexes
    - Add caching for frequently accessed data
    - _Requirements: 11.1, 11.2_

- [ ] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation uses TypeScript as specified in the design document
- All database operations use Supabase with RLS policies for security
- Multi-unit support is fully integrated throughout the workflow
- Session-based approach provides better audit trails and batch processing
- Checkpoints ensure incremental validation at key milestones
