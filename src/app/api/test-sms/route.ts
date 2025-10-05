import { sendSms } from '../../../lib/sms/twofactor';

/**
 * Test 2Factor SMS integration
 * Run this to verify SMS sending works
 */
export async function GET() {
  try {
    // Test SMS sending
    const testResult = await sendSms({
      to: '9999999999', // Replace with a test number
      message: 'Test SMS from TecBunny - 2Factor integration working!'
    });

    if (testResult.success) {
      return Response.json({
        success: true,
        message: 'SMS sent successfully',
        messageId: testResult.id
      });
    } else {
      return Response.json({
        success: false,
        error: testResult.error
      }, { status: 500 });
    }
  } catch (error) {
    return Response.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}